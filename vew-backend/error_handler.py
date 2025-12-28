"""
Enhanced Error Handler

Provides comprehensive error handling and logging for all services
"""

import logging
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
import json


class ErrorHandler:
    """
    Centralized error handling and logging system
    """
    
    def __init__(self, log_file='errors.log', log_level=logging.INFO):
        self.log_file = log_file
        
        # Configure logging
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        
        self.logger = logging.getLogger('VewErrorHandler')
        self.error_count = 0
    
    def log_error(
        self, 
        error: Exception,
        context: str = "",
        metadata: Optional[Dict[str, Any]] = None,
        critical: bool = False
    ):
        """
        Log an error with context
        
        Args:
            error: The exception that occurred
            context: Description of where/when error happened
            metadata: Additional information
            critical: Whether this is a critical error
        """
        self.error_count += 1
        
        error_info = {
            'timestamp': datetime.now().isoformat(),
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context,
            'traceback': traceback.format_exc(),
            'metadata': metadata or {},
            'count': self.error_count
        }
        
        # Log based on severity
        if critical:
            self.logger.critical(f"CRITICAL ERROR in {context}: {error}")
        else:
            self.logger.error(f"Error in {context}: {error}")
        
        # Save detailed error to JSON
        self._save_error_detail(error_info)
        
        return error_info
    
    def log_warning(self, message: str, context: str = ""):
        """Log a warning"""
        self.logger.warning(f"{context}: {message}")
    
    def log_info(self, message: str, context: str = ""):
        """Log an informational message"""
        self.logger.info(f"{context}: {message}")
    
    def log_success(self, message: str, context: str = ""):
        """Log a successful operation"""
        self.logger.info(f"✓ {context}: {message}")
    
    def _save_error_detail(self, error_info: Dict):
        """Save detailed error to JSON file"""
        try:
            error_log_path = 'error_details.json'
            
            # Load existing errors
            try:
                with open(error_log_path, 'r') as f:
                    errors = json.load(f)
            except FileNotFoundError:
                errors = []
            
            # Append new error
            errors.append(error_info)
            
            # Keep only last 100 errors
            errors = errors[-100:]
            
            # Save
            with open(error_log_path, 'w') as f:
                json.dump(errors, f, indent=2)
        
        except Exception as e:
            self.logger.error(f"Failed to save error detail: {e}")
    
    def handle_api_error(
        self, 
        api_name: str, 
        error: Exception,
        retry_count: int = 0
    ) -> Dict:
        """
        Handle API-specific errors with retry logic
        
        Returns:
            Dictionary with error info and suggested action
        """
        error_info = self.log_error(
            error,
            context=f"API Call: {api_name}",
            metadata={'retry_count': retry_count}
        )
        
        # Suggest action based on error type
        suggestion = self._get_error_suggestion(error, api_name)
        
        return {
            **error_info,
            'suggestion': suggestion,
            'should_retry': retry_count < 3 and suggestion.get('retryable', False)
        }
    
    def _get_error_suggestion(self, error: Exception, api_name: str) -> Dict:
        """Get suggestion for handling specific error"""
        error_type = type(error).__name__
        
        suggestions = {
            'ConnectionError': {
                'message': 'Network connection failed. Check internet connection.',
                'retryable': True
            },
            'TimeoutError': {
                'message': 'API request timed out. Retry with exponential backoff.',
                'retryable': True
            },
            'HTTPError': {
                'message': 'API returned HTTP error. Check API key and quota.',
                'retryable': False
            },
            'JSONDecodeError': {
                'message': 'Failed to parse API response. Check API format.',
                'retryable': False
            }
        }
        
        return suggestions.get(error_type, {
            'message': 'Unknown error occurred.',
            'retryable': False
        })
    
    def get_error_stats(self) -> Dict:
        """Get error statistics"""
        try:
            with open('error_details.json', 'r') as f:
                errors = json.load(f)
            
            # Count by type
            error_types = {}
            for error in errors:
                error_type = error.get('error_type', 'Unknown')
                error_types[error_type] = error_types.get(error_type, 0) + 1
            
            return {
                'total_errors': len(errors),
                'by_type': error_types,
                'recent_errors': errors[-5:]  # Last 5 errors
            }
        except FileNotFoundError:
            return {'total_errors': 0, 'by_type': {}, 'recent_errors': []}


# Global error handler instance
error_handler = ErrorHandler()


# Test
if __name__ == "__main__":
    # Test error logging
    try:
        raise ValueError("Test error")
    except Exception as e:
        error_handler.log_error(e, "Test Context", {'test': True})
    
    # Test API error
    try:
        raise ConnectionError("API connection failed")
    except Exception as e:
        result = error_handler.handle_api_error("qwen-plus", e, retry_count=1)
        print("\nAPI Error Result:", result)
    
    # Get stats
    stats = error_handler.get_error_stats()
    print("\nError Stats:", json.dumps(stats, indent=2))
