import { NormalizedLandmark } from "@mediapipe/tasks-vision";

// Euclidean distance between two 3D points
const distance = (p1: NormalizedLandmark, p2: NormalizedLandmark) => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
};

// Calculate Eye Aspect Ratio (EAR)
// Landmarks: [p1, p2, p3, p4, p5, p6]
// EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
export const calculateEAR = (landmarks: NormalizedLandmark[], indices: number[]) => {
  // indices for left eye: [33, 160, 158, 133, 153, 144]
  // indices for right eye: [362, 385, 387, 263, 373, 380]
  // 0: left corner, 3: right corner
  // 1: top1, 2: top2, 4: bottom2, 5: bottom1
  
  // Mapping standard indices to the subset passed in isn't direct if we pass full mesh.
  // We assume 'landmarks' is the full 468 point mesh and 'indices' are the specific IDs.
  
  const p1 = landmarks[indices[0]];
  const p2 = landmarks[indices[1]];
  const p3 = landmarks[indices[2]];
  const p4 = landmarks[indices[3]];
  const p5 = landmarks[indices[4]];
  const p6 = landmarks[indices[5]];

  const vertical1 = distance(p2, p6);
  const vertical2 = distance(p3, p5);
  const horizontal = distance(p1, p4);

  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2.0 * horizontal);
};

// Calculate Mouth Aspect Ratio (MAR)
// Vertical: 13 (upper), 14 (lower)
// Horizontal: 78 (left), 308 (right)
export const calculateMAR = (landmarks: NormalizedLandmark[]) => {
  const topLip = landmarks[13];
  const bottomLip = landmarks[14];
  const leftCorner = landmarks[78];
  const rightCorner = landmarks[308];

  const vertical = distance(topLip, bottomLip);
  const horizontal = distance(leftCorner, rightCorner);

  if (horizontal === 0) return 0;
  return vertical / horizontal;
};

// Indices for landmarks
export const LEFT_EYE_INDICES = [33, 160, 158, 133, 153, 144];
export const RIGHT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
