"""
API Call Tracker & Cost Monitor

Tracks all API calls and calculates costs in real-time
"""

import time
from typing import Dict, List
from datetime import datetime
import json


class APICallTracker:
    """
    Track API calls and costs for all services
    """
    
    # Pricing (per request or per token)
    PRICING = {
        'paraformer': 0.3 / 3600,  # ¥0.3 per hour of audio
        'qwen_vl': 0.06,  # ¥0.06 per call
        'qwen_tts': 2.0 / 10000,  # ¥2 per 10k characters
        'qwen_plus': 0.4 / 1000000,  # ¥0.4 per million tokens
        'qwen_235b': 20.0 / 1000000  # ¥20 per million tokens
    }
    
    def __init__(self, log_file='api_calls.json'):
        self.calls: Dict[str, List[Dict]] = {
            'paraformer': [],
            'qwen_vl': [],
            'qwen_tts': [],
            'qwen_plus': [],
            'qwen_235b': []
        }
        self.log_file = log_file
        self.load_from_file()
    
    def log_call(self, api_name: str, metadata: Dict = None):
        """
        Log an API call
        
        Args:
            api_name: Name of the API (paraformer, qwen_vl, etc.)
            metadata: Additional info (duration, tokens, characters, etc.)
        """
        if api_name not in self.calls:
            print(f"[Tracker] Warning: Unknown API '{api_name}'")
            return
        
        call_record = {
            'timestamp': datetime.now().isoformat(),
            'time_unix': time.time(),
            **(metadata or {})
        }
        
        self.calls[api_name].append(call_record)
        
        # Calculate cost
        cost = self._calculate_cost(api_name, metadata or {})
        
        print(f"[Cost] {api_name}: ¥{cost:.4f} (Total calls: {len(self.calls[api_name])})")
        
        # Save to file
        self.save_to_file()
    
    def _calculate_cost(self, api_name: str, metadata: Dict) -> float:
        """Calculate cost for a single call"""
        price = self.PRICING.get(api_name, 0)
        
        if api_name == 'paraformer':
            # Cost per hour of audio
            duration = metadata.get('duration', 0)  # seconds
            return (duration / 3600) * (0.3)
        
        elif api_name == 'qwen_vl':
            # Cost per call
            return 0.06
        
        elif api_name == 'qwen_tts':
            # Cost per 10k characters
            chars = metadata.get('characters', 0)
            return (chars / 10000) * 2.0
        
        elif api_name in ['qwen_plus', 'qwen_235b']:
            # Cost per million tokens
            tokens = metadata.get('tokens', 0)
            return (tokens / 1000000) * self.PRICING[api_name]
        
        return 0.0
    
    def get_total_cost(self) -> float:
        """Calculate total cost across all APIs"""
        total = 0.0
        
        for api_name, calls in self.calls.items():
            for call in calls:
                total += self._calculate_cost(api_name, call)
        
        return total
    
    def get_stats(self) -> Dict:
        """Get statistics for all APIs"""
        stats = {
            'total_calls': sum(len(calls) for calls in self.calls.values()),
            'total_cost': self.get_total_cost(),
            'by_api': {}
        }
        
        for api_name, calls in self.calls.items():
            if len(calls) > 0:
                api_cost = sum(self._calculate_cost(api_name, call) for call in calls)
                stats['by_api'][api_name] = {
                    'calls': len(calls),
                    'cost': api_cost
                }
        
        return stats
    
    def print_summary(self):
        """Print cost summary to console"""
        stats = self.get_stats()
        
        print("\n" + "="*60)
        print("API Cost Summary")
        print("="*60)
        print(f"Total Calls: {stats['total_calls']}")
        print(f"Total Cost:  ¥{stats['total_cost']:.2f}")
        print("\nBy API:")
        
        for api_name, api_stats in stats['by_api'].items():
            print(f"  {api_name:15} {api_stats['calls']:5} calls  ¥{api_stats['cost']:8.2f}")
        
        print("="*60 + "\n")
    
    def save_to_file(self):
        """Save call log to file"""
        try:
            with open(self.log_file, 'w') as f:
                json.dump(self.calls, f, indent=2)
        except Exception as e:
            print(f"[Tracker] Error saving to file: {e}")
    
    def load_from_file(self):
        """Load call log from file"""
        try:
            with open(self.log_file, 'r') as f:
                loaded_calls = json.load(f)
                self.calls.update(loaded_calls)
        except FileNotFoundError:
            pass  # File doesn't exist yet
        except Exception as e:
            print(f"[Tracker] Error loading from file: {e}")
    
    def reset(self):
        """Reset all counters"""
        for key in self.calls:
            self.calls[key] = []
        self.save_to_file()
        print("[Tracker] All counters reset")


# Global tracker instance
tracker = APICallTracker()


# Test
if __name__ == "__main__":
    # Simulate some API calls
    tracker.log_call('paraformer', {'duration': 120})  # 2 min audio
    tracker.log_call('qwen_vl', {})
    tracker.log_call('qwen_tts', {'characters': 50})
    tracker.log_call('qwen_plus', {'tokens': 500})
    tracker.log_call('qwen_235b', {'tokens': 1000})
    
    # Print summary
    tracker.print_summary()
