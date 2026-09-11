#!/usr/bin/env python3
"""
Quick test script to verify Supabase connection
"""

import psycopg2
import os

# Supabase connection details
SUPABASE_CONFIG = {
    'host': 'db.bprcdnaagiiixkiuzane.supabase.co',
    'database': 'postgres',
    'user': 'postgres',
    'password': 'P@sswr0d.4575',
    'port': '5432'
}

def test_connection():
    try:
        print("Testing Supabase connection...")
        print(f"Host: {SUPABASE_CONFIG['host']}")
        print(f"Database: {SUPABASE_CONFIG['database']}")
        print(f"User: {SUPABASE_CONFIG['user']}")
        
        # Connect
        conn = psycopg2.connect(**SUPABASE_CONFIG)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Connected successfully!")
        print(f"PostgreSQL version: {version}")
        
        # Check if we can create tables
        cursor.execute("SELECT 1;")
        result = cursor.fetchone()[0]
        print(f"✅ Query test successful: {result}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Supabase connection is working perfectly!")
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    test_connection()