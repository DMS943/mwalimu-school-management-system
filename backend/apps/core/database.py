"""
Database optimization utilities and configurations for production readiness.
"""

import logging
from typing import Dict, Any, List
from django.core.management.base import BaseCommand
from django.db import connections, connection
from django.conf import settings
import psutil
import time

logger = logging.getLogger('app.database')


class DatabaseOptimizer:
    """Database optimization and monitoring utilities."""
    
    @staticmethod
    def get_connection_info(alias='default') -> Dict[str, Any]:
        """Get database connection information."""
        conn = connections[alias]
        return {
            'vendor': conn.vendor,
            'settings': {
                'NAME': conn.settings_dict.get('NAME'),
                'HOST': conn.settings_dict.get('HOST'),
                'PORT': conn.settings_dict.get('PORT'),
                'CONN_MAX_AGE': conn.settings_dict.get('CONN_MAX_AGE'),
            },
            'queries': len(conn.queries),
        }
    
    @staticmethod
    def get_database_stats(alias='default') -> Dict[str, Any]:
        """Get database performance statistics."""
        with connections[alias].cursor() as cursor:
            try:
                # Database size
                cursor.execute("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as db_size,
                           pg_database_size(current_database()) as db_size_bytes
                """)
                db_size = cursor.fetchone()
                
                # Connection stats
                cursor.execute("""
                    SELECT count(*) as total_connections,
                           count(*) FILTER (WHERE state = 'active') as active_connections,
                           count(*) FILTER (WHERE state = 'idle') as idle_connections
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                """)
                conn_stats = cursor.fetchone()
                
                # Cache hit ratio
                cursor.execute("""
                    SELECT 
                        sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio
                    FROM pg_statio_user_tables
                """)
                cache_hit = cursor.fetchone()
                
                # Slow queries (queries running longer than 1 second)
                cursor.execute("""
                    SELECT count(*) as slow_queries
                    FROM pg_stat_activity 
                    WHERE state = 'active' 
                    AND query_start < now() - interval '1 second'
                    AND datname = current_database()
                """)
                slow_queries = cursor.fetchone()
                
                return {
                    'database_size': db_size[0] if db_size else 'Unknown',
                    'database_size_bytes': db_size[1] if db_size else 0,
                    'total_connections': conn_stats[0] if conn_stats else 0,
                    'active_connections': conn_stats[1] if conn_stats else 0,
                    'idle_connections': conn_stats[2] if conn_stats else 0,
                    'cache_hit_ratio': round(cache_hit[0], 2) if cache_hit and cache_hit[0] else 0,
                    'slow_queries': slow_queries[0] if slow_queries else 0,
                }
            except Exception as e:
                logger.error(f"Error getting database stats: {e}")
                return {
                    'error': str(e),
                    'database_size': 'Unknown',
                    'total_connections': 0,
                    'active_connections': 0,
                    'idle_connections': 0,
                    'cache_hit_ratio': 0,
                    'slow_queries': 0,
                }
    
    @staticmethod
    def get_table_stats(alias='default') -> List[Dict[str, Any]]:
        """Get table-level statistics."""
        with connections[alias].cursor() as cursor:
            try:
                cursor.execute("""
                    SELECT 
                        schemaname,
                        tablename,
                        attname,
                        n_distinct,
                        correlation
                    FROM pg_stats 
                    WHERE schemaname = 'public'
                    ORDER BY tablename, attname
                """)
                
                stats = []
                for row in cursor.fetchall():
                    stats.append({
                        'schema': row[0],
                        'table': row[1],
                        'column': row[2],
                        'distinct_values': row[3],
                        'correlation': row[4],
                    })
                
                return stats
            except Exception as e:
                logger.error(f"Error getting table stats: {e}")
                return []
    
    @staticmethod
    def analyze_missing_indexes(alias='default') -> List[Dict[str, Any]]:
        """Analyze potentially missing indexes."""
        with connections[alias].cursor() as cursor:
            try:
                # Query to find tables with high sequential scans
                cursor.execute("""
                    SELECT 
                        schemaname,
                        tablename,
                        seq_scan,
                        seq_tup_read,
                        idx_scan,
                        idx_tup_fetch,
                        n_tup_ins + n_tup_upd + n_tup_del as write_activity
                    FROM pg_stat_user_tables 
                    WHERE seq_scan > 1000 
                    OR (seq_scan > idx_scan AND seq_tup_read > 10000)
                    ORDER BY seq_scan DESC
                """)
                
                recommendations = []
                for row in cursor.fetchall():
                    recommendations.append({
                        'schema': row[0],
                        'table': row[1],
                        'sequential_scans': row[2],
                        'sequential_reads': row[3],
                        'index_scans': row[4] or 0,
                        'index_fetches': row[5] or 0,
                        'write_activity': row[6] or 0,
                        'recommendation': 'Consider adding indexes on frequently queried columns'
                    })
                
                return recommendations
            except Exception as e:
                logger.error(f"Error analyzing indexes: {e}")
                return []


class DatabaseConnectionPooling:
    """Database connection pooling configuration."""
    
    @staticmethod
    def get_pool_settings(environment='production') -> Dict[str, Any]:
        """Get connection pool settings based on environment."""
        if environment == 'production':
            return {
                'CONN_MAX_AGE': 600,  # 10 minutes
                'OPTIONS': {
                    'MAX_CONNS': 20,
                    'MIN_CONNS': 5,
                    'connect_timeout': 60,
                    'options': '-c default_transaction_isolation=read_committed -c statement_timeout=30000',
                    'sslmode': 'require',
                }
            }
        elif environment == 'staging':
            return {
                'CONN_MAX_AGE': 300,  # 5 minutes
                'OPTIONS': {
                    'MAX_CONNS': 10,
                    'MIN_CONNS': 2,
                    'connect_timeout': 30,
                    'options': '-c default_transaction_isolation=read_committed -c statement_timeout=30000',
                }
            }
        else:  # development
            return {
                'CONN_MAX_AGE': 60,   # 1 minute
                'OPTIONS': {
                    'MAX_CONNS': 5,
                    'MIN_CONNS': 1,
                    'connect_timeout': 15,
                    'options': '-c default_transaction_isolation=read_committed',
                }
            }


class DatabaseQueryOptimizer:
    """Query optimization utilities."""
    
    @staticmethod
    def log_slow_queries():
        """Log slow queries for analysis."""
        from django.db import connection
        
        queries = []
        for query in connection.queries:
            if float(query['time']) > 0.1:  # Queries slower than 100ms
                queries.append({
                    'sql': query['sql'],
                    'time': query['time'],
                    'timestamp': time.time()
                })
        
        if queries:
            logger.warning(f"Slow queries detected: {len(queries)} queries")
            for query in queries:
                logger.warning(f"Slow query ({query['time']}s): {query['sql'][:200]}")
        
        return queries
    
    @staticmethod
    def explain_query(sql: str, alias='default') -> Dict[str, Any]:
        """Get execution plan for a query."""
        with connections[alias].cursor() as cursor:
            try:
                cursor.execute(f"EXPLAIN ANALYZE {sql}")
                plan = cursor.fetchall()
                return {
                    'query': sql,
                    'execution_plan': [row[0] for row in plan],
                    'analyzed': True
                }
            except Exception as e:
                logger.error(f"Error explaining query: {e}")
                return {
                    'query': sql,
                    'error': str(e),
                    'analyzed': False
                }


def get_database_health_check() -> Dict[str, Any]:
    """Comprehensive database health check."""
    try:
        optimizer = DatabaseOptimizer()
        
        # Basic connectivity test
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        connection_info = optimizer.get_connection_info()
        db_stats = optimizer.get_database_stats()
        index_recommendations = optimizer.analyze_missing_indexes()
        
        # Calculate health score
        health_score = 100
        if db_stats.get('cache_hit_ratio', 0) < 95:
            health_score -= 20
        if db_stats.get('slow_queries', 0) > 10:
            health_score -= 15
        if len(index_recommendations) > 5:
            health_score -= 10
        
        return {
            'healthy': health_score >= 70,
            'health_score': health_score,
            'connection_info': connection_info,
            'statistics': db_stats,
            'index_recommendations': index_recommendations[:5],  # Top 5 recommendations
            'recommendations_count': len(index_recommendations),
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            'healthy': False,
            'health_score': 0,
            'error': str(e)
        }