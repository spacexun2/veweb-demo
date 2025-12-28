"""
YOLOv8 Action Detector

Detects UI elements, cursor actions, and screen activities in screen recordings.

Detection Categories:
- UI elements: buttons, text fields, links, icons
- Cursor actions: click, hover, drag
- Screen events: typing, scrolling, window switching
"""

import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional
from ultralytics import YOLO


class ActionDetector:
    """
    YOLOv8-based action and UI element detector for screen recordings.
    """
    
    def __init__(self, model_name: str = "yolov8m.pt", device: str = "cpu"):
        """
        Initialize action detector
        
        Args:
            model_name: YOLOv8 model to use (yolov8n/s/m/l/x)
            device: Device to run on ('cpu', 'cuda', or 'mps' for Apple Silicon)
        """
        print(f"[ActionDetector] Loading YOLOv8 model: {model_name}")
        self.model = YOLO(model_name)
        self.device = device
        
        # Custom UI element classes for fine-tuned models
        # In production, you might fine-tune YOLOv8 on screen recording dataset
        self.ui_classes = {
            'button': 0,
            'textbox': 1,
            'icon': 2,
            'cursor': 3,
            'window': 4,
            'menu': 5,
            'error_highlight': 6
        }
        
        self.prev_cursor_pos = None
        
    def detect_objects(
        self,
        frame: np.ndarray,
        confidence: float = 0.25
    ) -> List[Dict]:
        """
        Detect objects in frame
        
        Args:
            frame: Input frame (BGR)
            confidence: Detection confidence threshold
            
        Returns:
            List of detection dicts with bbox, class, confidence
        """
        results = self.model(frame, device=self.device, conf=confidence, verbose=False)
        
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                detection = {
                    'bbox': box.xyxy[0].cpu().numpy().tolist(),  # [x1, y1, x2, y2]
                    'confidence': float(box.conf[0]),
                    'class_id': int(box.cls[0]),
                    'class_name': result.names[int(box.cls[0])]
                }
                detections.append(detection)
        
        return detections
    
    def detect_cursor(self, frame: np.ndarray) -> Optional[Tuple[int, int]]:
        """
        Detect cursor position using template matching or custom detection
        
        Args:
            frame: Input frame
            
        Returns:
            Cursor position (x, y) or None
        """
        # Simplified cursor detection using corner detection
        # In production, use trained model or OS cursor tracking
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Find bright spots that might be cursor
        _, thresh = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Get largest small contour (likely cursor)
            small_contours = [c for c in contours if cv2.contourArea(c) < 1000]
            if small_contours:
                largest = max(small_contours, key=cv2.contourArea)
                M = cv2.moments(largest)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                    return (cx, cy)
        
        return None
    
    def detect_click_action(
        self,
        current_pos: Optional[Tuple[int, int]],
        prev_pos: Optional[Tuple[int, int]]
    ) -> bool:
        """
        Detect if a click action occurred based on cursor movement patterns
        
        Args:
            current_pos: Current cursor position
            prev_pos: Previous cursor position
            
        Returns:
            True if click detected
        """
        if current_pos is None or prev_pos is None:
            return False
        
        # Simple heuristic: sudden stop after movement
        distance = np.sqrt((current_pos[0] - prev_pos[0])**2 + 
                          (current_pos[1] - prev_pos[1])**2)
        
        # If cursor moved significantly then stopped, likely clicked
        return 5 < distance < 30
    
    def detect_typing(self, frame: np.ndarray, prev_frame: Optional[np.ndarray]) -> bool:
        """
        Detect typing activity based on frame changes in text regions
        
        Args:
            frame: Current frame
            prev_frame: Previous frame
            
        Returns:
            True if typing detected
        """
        if prev_frame is None:
            return False
        
        # Calculate difference in bottom half of screen (where text often appears)
        h, w = frame.shape[:2]
        roi_current = frame[h//2:, :]
        roi_prev = prev_frame[h//2:, :]
        
        diff = cv2.absdiff(roi_current, roi_prev)
        gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        
        # Count significant changes
        _, thresh = cv2.threshold(gray_diff, 30, 255, cv2.THRESH_BINARY)
        change_ratio = np.sum(thresh > 0) / thresh.size
        
        # Typing causes localized changes (0.1% - 5% of ROI)
        return 0.001 < change_ratio < 0.05
    
    def detect_error_highlights(self, frame: np.ndarray) -> List[Dict]:
        """
        Detect error highlights (red underlines, error messages)
        
        Args:
            frame: Input frame
            
        Returns:
            List of error highlight detections
        """
        # Convert to HSV for color detection
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # Red color range for error highlights
        lower_red1 = np.array([0, 100, 100])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([160, 100, 100])
        upper_red2 = np.array([180, 255, 255])
        
        mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        red_mask = cv2.bitwise_or(mask1, mask2)
        
        # Find contours of red regions
        contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        errors = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if 100 < area < 50000:  # Filter by size
                x, y, w, h = cv2.boundingRect(contour)
                errors.append({
                    'type': 'error_highlight',
                    'bbox': [x, y, x+w, y+h],
                    'area': area
                })
        
        return errors
    
    def analyze_frame(
        self,
        frame: np.ndarray,
        prev_frame: Optional[np.ndarray] = None
    ) -> Dict:
        """
        Comprehensive frame analysis
        
        Args:
            frame: Current frame
            prev_frame: Previous frame for motion analysis
            
        Returns:
            Analysis results dict
        """
        # Detect objects
        detections = self.detect_objects(frame)
        
        # Detect cursor
        cursor_pos = self.detect_cursor(frame)
        
        # Detect actions
        click_detected = self.detect_click_action(cursor_pos, self.prev_cursor_pos)
        typing_detected = self.detect_typing(frame, prev_frame) if prev_frame is not None else False
        
        # Detect errors
        error_highlights = self.detect_error_highlights(frame)
        
        # Update state
        self.prev_cursor_pos = cursor_pos
        
        analysis = {
            'timestamp': time.time(),
            'objects': detections,
            'cursor_position': cursor_pos,
            'actions': {
                'click': click_detected,
                'typing': typing_detected
            },
            'errors': error_highlights,
            'summary': self._generate_summary(detections, click_detected, typing_detected, error_highlights)
        }
        
        return analysis
    
    def _generate_summary(
        self,
        detections: List[Dict],
        click: bool,
        typing: bool,
        errors: List[Dict]
    ) -> str:
        """Generate human-readable summary of frame analysis"""
        parts = []
        
        if click:
            parts.append("Click action detected")
        if typing:
            parts.append("Typing activity")
        if errors:
            parts.append(f"{ len(errors)} error(s) highlighted")
        if detections:
            parts.append(f"{len(detections)} objects detected")
        
        return ", ".join(parts) if parts else "No significant activity"


import time

if __name__ == "__main__":
    # Test action detector
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python action_detector.py <video_path>")
        sys.exit(1)
    
    video_path = sys.argv[1]
    detector = ActionDetector(model_name="yolov8n.pt")  # Use nano for testing
    
    cap = cv2.VideoCapture(video_path)
    prev_frame = None
    frame_count = 0
    
    while cap.isOpened() and frame_count < 100:  # Test first 100 frames
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_count % 30 == 0:  # Analyze every 30 frames
            analysis = detector.analyze_frame(frame, prev_frame)
            print(f"Frame {frame_count}: {analysis['summary']}")
            if analysis['errors']:
                print(f"  Errors detected: {len(analysis['errors'])}")
        
        prev_frame = frame
        frame_count += 1
    
    cap.release()
    print(f"\nProcessed {frame_count} frames")
