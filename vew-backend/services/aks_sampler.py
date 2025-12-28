"""
Adaptive Keyframe Sampling (AKS)

Intelligently extracts keyframes from video stream based on content change detection.
Uses optical flow and scene change detection to determine optimal sampling intervals.

Sampling Strategy:
- High activity: sample every 1s
- Medium activity: sample every 2s  
- Low activity: sample every 5s
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional
import time


class AdaptiveKeyframeSampler:
    """
    Adaptive keyframe sampling for video streams.
    
    Dynamically adjusts sampling rate based on content activity level.
    """
    
    def __init__(
        self,
        min_interval: float = 1.0,   # High activity
        med_interval: float = 2.0,   # Medium activity
        max_interval: float = 5.0,   # Low activity
        change_threshold: float = 0.3  # Scene change sensitivity
    ):
        """
        Initialize AKS sampler
        
        Args:
            min_interval: Minimum seconds between keyframes (high activity)
            med_interval: Medium interval (medium activity)
            max_interval: Maximum interval (low activity)
            change_threshold: Threshold for detecting significant change (0-1)
        """
        self.min_interval = min_interval
        self.med_interval = med_interval
        self.max_interval = max_interval
        self.change_threshold = change_threshold
        
        self.prev_frame = None
        self.prev_gray = None
        self.last_keyframe_time = 0
        
    def calculate_frame_difference(
        self, 
        frame1: np.ndarray, 
        frame2: np.ndarray
    ) -> float:
        """
        Calculate difference between two frames
        
        Args:
            frame1: First frame (BGR)
            frame2: Second frame (BGR)
            
        Returns:
            Normalized difference score (0-1)
        """
        # Convert to grayscale
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
        
        # Calculate absolute difference
        diff = cv2.absdiff(gray1, gray2)
        
        # Normalize to 0-1
        diff_score = np.mean(diff) / 255.0
        
        return diff_score
    
    def calculate_optical_flow(
        self,
        frame1: np.ndarray,
        frame2: np.ndarray
    ) -> float:
        """
        Calculate optical flow magnitude between frames
        
        Args:
            frame1: First frame (BGR)
            frame2: Second frame (BGR)
            
        Returns:
            Average flow magnitude (0-1 normalized)
        """
        gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)
        
        #Farneback optical flow
        flow = cv2.calcOpticalFlowFarneback(
            gray1, gray2, None,
            pyr_scale=0.5,
            levels=3,
            winsize=15,
            iterations=3,
            poly_n=5,
            poly_sigma=1.2,
            flags=0
        )
        
        # Calculate magnitude
        magnitude = np.sqrt(flow[..., 0]**2 + flow[..., 1]**2)
        
        # Normalize to 0-1 (assume max magnitude of 50 pixels)
        avg_magnitude = np.mean(magnitude) / 50.0
        
        return min(avg_magnitude, 1.0)
    
    def determine_activity_level(self, change_score: float) -> str:
        """
        Determine activity level based on change score
        
        Args:
            change_score: Change score from frame difference/flow
            
        Returns:
            Activity level: 'high', 'medium', or 'low'
        """
        if change_score > self.change_threshold * 2:
            return 'high'
        elif change_score > self.change_threshold:
            return 'medium'
        else:
            return 'low'
    
    def get_sampling_interval(self, activity_level: str) -> float:
        """Get sampling interval for activity level"""
        intervals = {
            'high': self.min_interval,
            'medium': self.med_interval,
            'low': self.max_interval
        }
        return intervals.get(activity_level, self.med_interval)
    
    def should_sample_frame(
        self, 
        frame: np.ndarray, 
        timestamp: float
    ) -> Tuple[bool, Optional[dict]]:
        """
        Determine if current frame should be sampled as keyframe
        
        Args:
            frame: Current frame (BGR)
            timestamp: Current timestamp in seconds
            
        Returns:
            Tuple of (should_sample, metadata_dict)
        """
        # Always sample first frame
        if self.prev_frame is None:
            if frame is not None:
                self.prev_frame = frame.copy()
            self.last_keyframe_time = timestamp
            return True, {
                'activity': 'init',
                'change_score': 0.0,
                'interval': 0.0
            }
        
        # Calculate change from previous frame
        change_score = self.calculate_frame_difference(self.prev_frame, frame)
        
        # Determine activity level
        activity = self.determine_activity_level(change_score)
        required_interval = self.get_sampling_interval(activity)
        
        # Check if enough time has passed
        time_since_last = timestamp - self.last_keyframe_time
        
        should_sample = time_since_last >= required_interval
        
        if should_sample:
            if frame is not None:
                self.prev_frame = frame.copy()
            self.last_keyframe_time = timestamp
        
        metadata = {
            'activity': activity,
            'change_score': round(change_score, 3),
            'interval': round(time_since_last, 2),
            'required_interval': required_interval
        }
        
        return should_sample, metadata
    
    def reset(self):
        """Reset sampler state"""
        self.prev_frame = None
        self.prev_gray = None
        self.last_keyframe_time = 0


def extract_keyframes_from_video(
    video_path: str,
    output_dir: Optional[str] = None,
    save_frames: bool = False
) -> List[dict]:
    """
    Extract keyframes from a video file using AKS
    
    Args:
        video_path: Path to video file
        output_dir: Directory to save keyframes (if save_frames=True)
        save_frames: Whether to save frames to disk
        
    Returns:
        List of keyframe metadata dicts
    """
    import os
    
    sampler = AdaptiveKeyframeSampler()
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        fps = 30  # Default fallback
    
    keyframes = []
    frame_count = 0
    
    if save_frames and output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        timestamp = frame_count / fps
        should_sample, metadata = sampler.should_sample_frame(frame, timestamp)
        
        if should_sample:
            keyframe_data = {
                'frame_number': frame_count,
                'timestamp': round(timestamp, 2),
                **metadata
            }
            
            if save_frames and output_dir:
                filename = f"keyframe_{len(keyframes):04d}_t{timestamp:.2f}s.jpg"
                filepath = os.path.join(output_dir, filename)
                cv2.imwrite(filepath, frame)
                keyframe_data['path'] = filepath
            else:
                # Store frame in memory as base64 or numpy array
                keyframe_data['frame'] = frame
            
            keyframes.append(keyframe_data)
            print(f"[AKS] Keyframe {len(keyframes)}: t={timestamp:.2f}s, activity={metadata['activity']}, change={metadata['change_score']}")
        
        frame_count += 1
    
    cap.release()
    
    print(f"[AKS] Extracted {len(keyframes)} keyframes from {frame_count} total frames")
    return keyframes


if __name__ == "__main__":
    # Test AKS with a video file
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python aks_sampler.py <video_path>")
        sys.exit(1)
    
    video_path = sys.argv[1]
    keyframes = extract_keyframes_from_video(video_path, save_frames=False)
    
    print(f"\nExtracted {len(keyframes)} keyframes:")
    for i, kf in enumerate(keyframes[:10]):  # Show first 10
        print(f"  {i+1}. t={kf['timestamp']}s, activity={kf['activity']}, change={kf['change_score']}")
