"""
AI Interaction Trigger Engine

Determines when AI should proactively interact with user based on:
- Screen content analysis
- User behavior patterns
- Error detection
- Navigation changes
"""

from typing import Dict, Optional, List
from dataclasses import dataclass
import time


@dataclass
class InteractionContext:
    """Context for trigger evaluation"""
    current_frame: any
    prev_frame: Optional[any]
    timestamp: float
    idle_time: float
    vlm_analysis: Optional[Dict]
    action_analysis: Optional[Dict]
    conversation_history: List[Dict]


class InteractionTrigger:
    """
    AI interaction trigger engine.
    
    Evaluates various conditions to determine when AI should speak up.
    """
    
    def __init__(self):
        """Initialize trigger engine"""
        self.last_interaction_time = 0
        self.interaction_cooldown = 15.0  # Minimum seconds between interactions (reduced from 10)
        
        # Trigger conditions and their messages - focusing on meaningful triggers
        self.triggers = {
            # Disabled: error detection is not meaningful without VLM understanding
            # 'error_detected': {
            #     'condition': self._check_error_detected,
            #     'message_zh': "我发现了一个错误，需要帮助吗？",
            #     'message_en': "I detected an error. Need help?",
            #     'priority': 'high'
            # },
            'long_pause': {
                'condition': self._check_long_pause,
                'message_zh': "你已经停留一会儿了，需要我总结一下吗？",
                'message_en': "You've been here a while. Want me to summarize?",
                'priority': 'medium'
            },
            'very_long_pause': {
                'condition': self._check_very_long_pause,
                'message_zh': "需要帮忙吗？我看你停顿了一段时间。",
                'message_en': "Need help? I notice you've paused for a while.",
                'priority': 'high'
            },
            # Keep these for future VLM-based detection
            'navigation_change': {
                'condition': self._check_navigation_change,
                'message_zh': "你切换到了新页面，要记录一下吗？",
                'message_en': "You switched to a new page. Should I note that?",
                'priority': 'low'
            },
            'code_debugging': {
                'condition': self._check_code_debugging,
                'message_zh': "看起来你在调试代码，需要我帮你review一下逻辑吗？",
                'message_en': "Looks like you're debugging. Want me to review the logic?",
                'priority': 'medium'
            },
            'tutorial_following': {
                'condition': self._check_tutorial_following,
                'message_zh': "你在跟随教程吗？我可以帮你做笔记。",
                'message_en': "Following a tutorial? I can take notes for you.",
                'priority': 'low'
            }
        }
    
    def should_interact(
        self,
        context: InteractionContext,
        language: str = "zh"
    ) -> Optional[Dict]:
        """
        Evaluate if AI should interact
        
        Args:
            context: Current interaction context
            language: Language for messages
            
        Returns:
            Dict with message and priority if should interact, None otherwise
        """
        # Check cooldown
        time_since_last = context.timestamp - self.last_interaction_time
        if time_since_last < self.interaction_cooldown:
            return None
        
        # Evaluate triggers by priority
        triggered = []
        for trigger_name, trigger_config in self.triggers.items():
            if trigger_config['condition'](context):
                triggered.append({
                    'name': trigger_name,
                    'message': trigger_config[f'message_{language}'],
                    'priority': trigger_config['priority']
                })
        
        if not triggered:
            return None
        
        # Sort by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        triggered.sort(key=lambda x: priority_order[x['priority']])
        
        # Return highest priority trigger
        best_trigger = triggered[0]
        self.last_interaction_time = context.timestamp
        
        return best_trigger
    
    def _check_error_detected(self, ctx: InteractionContext) -> bool:
        """Check if errors are detected - requires multiple errors to avoid false positives"""
        if not ctx.action_analysis:
            return False
        # Require at least 2 errors to reduce false positives  
        return len(ctx.action_analysis.get('errors', [])) >= 2
    
    def _check_long_pause(self, ctx: InteractionContext) -> bool:
        """Check if user has been idle"""
        return ctx.idle_time > 20.0  # 20 seconds of no significant activity
    
    def _check_very_long_pause(self, ctx: InteractionContext) -> bool:
        """Check if user has been idle for a long time"""
        return ctx.idle_time > 30.0  # 30 seconds - definitely stuck
    
    def _check_navigation_change(self, ctx: InteractionContext) -> bool:
        """Check if scene changed significantly"""
        if not ctx.vlm_analysis or not hasattr(ctx, 'prev_vlm_analysis'):
            return False
        
        # Simple heuristic: if scene description changed a lot
        current = ctx.vlm_analysis.get('scene_description', '')
        prev = getattr(ctx, 'prev_scene_description', '')
        
        if not prev:
            return False
        
        # Calculate simple similarity (more sophisticated NLP in production)
        common_words = set(current.split()) & set(prev.split())
        similarity = len(common_words) / max(len(current.split()), 1)
        
        return similarity < 0.3  # Less than 30% word overlap = major change
    
    def _check_code_debugging(self, ctx: InteractionContext) -> bool:
        """Check if user is debugging code"""
        if not ctx.vlm_analysis:
            return False
        
        scene = ctx.vlm_analysis.get('scene_description', '').lower()
        debug_keywords = ['debug', '调试', 'error', '错误', 'breakpoint', '断点']
        
        return any(keyword in scene for keyword in debug_keywords)
    
    def _check_tutorial_following(self, ctx: InteractionContext) -> bool:
        """Check if user is following a tutorial"""
        if not ctx.vlm_analysis:
            return False
        
        scene = ctx.vlm_analysis.get('scene_description', '').lower()
        tutorial_keywords = ['tutorial', '教程', 'documentation', '文档', 'guide', '指南']
        
        return any(keyword in scene for keyword in tutorial_keywords)


if __name__ == "__main__":
    # Test trigger engine
    engine = InteractionTrigger()
    
    # Simulate error detection
    test_context = InteractionContext(
        current_frame=None,
        prev_frame=None,
        timestamp=time.time(),
        idle_time=5.0,
        vlm_analysis={'scene_description': '用户在编辑代码'},
        action_analysis={'errors': [{'type': 'syntax_error'}]},
        conversation_history=[]
    )
    
    result = engine.should_interact(test_context, language="zh")
    if result:
        print(f"Trigger: {result['name']}")
        print(f"Message: {result['message']}")
        print(f"Priority: {result['priority']}")
    else:
        print("No trigger activated")
