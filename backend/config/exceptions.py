"""
Custom exception handlers for the School Management System API.
"""
import logging
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import Http404

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses
    and logs errors appropriately.
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)
    
    # Get the view and request from context
    view = context.get('view', None)
    request = context.get('request', None)
    
    # Log the error
    if response is not None:
        log_error(exc, context, response.status_code)
    
    if response is not None:
        custom_response_data = {
            'error': True,
            'message': '',
            'details': {},
            'status_code': response.status_code
        }
        
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                custom_response_data['message'] = response.data['detail']
            elif 'non_field_errors' in response.data:
                custom_response_data['message'] = response.data['non_field_errors'][0] if response.data['non_field_errors'] else 'Validation error'
            else:
                custom_response_data['details'] = response.data
                custom_response_data['message'] = 'Validation failed'
        elif isinstance(response.data, list):
            custom_response_data['message'] = response.data[0] if response.data else 'Error occurred'
        else:
            custom_response_data['message'] = str(response.data)
        
        response.data = custom_response_data
        
    # Handle specific Django exceptions that DRF doesn't catch
    elif isinstance(exc, ValidationError):
        custom_response_data = {
            'error': True,
            'message': 'Validation error',
            'details': exc.message_dict if hasattr(exc, 'message_dict') else {'non_field_errors': exc.messages},
            'status_code': status.HTTP_400_BAD_REQUEST
        }
        log_error(exc, context, status.HTTP_400_BAD_REQUEST)
        response = Response(custom_response_data, status=status.HTTP_400_BAD_REQUEST)
        
    elif isinstance(exc, IntegrityError):
        custom_response_data = {
            'error': True,
            'message': 'Database integrity error. This operation violates a database constraint.',
            'details': {'database_error': str(exc)},
            'status_code': status.HTTP_400_BAD_REQUEST
        }
        log_error(exc, context, status.HTTP_400_BAD_REQUEST)
        response = Response(custom_response_data, status=status.HTTP_400_BAD_REQUEST)
        
    elif isinstance(exc, Http404):
        custom_response_data = {
            'error': True,
            'message': 'Resource not found',
            'details': {},
            'status_code': status.HTTP_404_NOT_FOUND
        }
        log_error(exc, context, status.HTTP_404_NOT_FOUND)
        response = Response(custom_response_data, status=status.HTTP_404_NOT_FOUND)
        
    # Handle unexpected errors
    elif response is None:
        custom_response_data = {
            'error': True,
            'message': 'An unexpected error occurred',
            'details': {'error_type': type(exc).__name__},
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR
        }
        log_error(exc, context, status.HTTP_500_INTERNAL_SERVER_ERROR)
        response = Response(custom_response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return response


def log_error(exc, context, status_code):
    """
    Log error details for monitoring and debugging.
    """
    view = context.get('view', None)
    request = context.get('request', None)
    
    error_data = {
        'exception_type': type(exc).__name__,
        'exception_message': str(exc),
        'status_code': status_code,
        'view': view.__class__.__name__ if view else 'Unknown',
        'method': request.method if request else 'Unknown',
        'path': request.path if request else 'Unknown',
        'user': str(request.user) if request and hasattr(request, 'user') else 'Anonymous',
    }
    
    if status_code >= 500:
        logger.error(
            f"Internal Server Error: {error_data['exception_type']} - {error_data['exception_message']}",
            extra=error_data,
            exc_info=True
        )
    elif status_code >= 400:
        logger.warning(
            f"Client Error: {error_data['exception_type']} - {error_data['exception_message']}",
            extra=error_data
        )
    else:
        logger.info(
            f"Request Error: {error_data['exception_type']} - {error_data['exception_message']}",
            extra=error_data
        )