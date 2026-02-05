
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface Point3D {
    x: number;
    y: number;
    z: number;
}

export function distance(p1: Point3D, p2: Point3D): number {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
    );
}

export function distance2D(p1: Point3D, p2: Point3D): number {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Vector math helpers
function sub(a: Point3D, b: Point3D): Point3D {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a: Point3D, b: Point3D): Point3D {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}
function dot(a: Point3D, b: Point3D): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
function normalize(a: Point3D): Point3D {
    const len = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: a.x / len, y: a.y / len, z: a.z / len };
}
function scaleVec(a: Point3D, s: number): Point3D {
    return { x: a.x * s, y: a.y * s, z: a.z * s };
}

/**
 * Calculates a symmetry map using a plane of symmetry defined by midline landmarks.
 * This handles rotated faces (yaw/roll) much better than simple x-reflection.
 * 
 * Midline landmarks:
 * 10: Top of forehead
 * 152: Chin bottom
 * 168: Glabella (between eyes) - used for depth plane def if needed, or 6 (nose bridge)
 */
export function calculateSymmetryMap(landmarks: NormalizedLandmark[]): Record<number, number> {
    const map: Record<number, number> = {};

    // 1. Define Symmetry Plane
    // We need a point on the plane and a normal vector.
    // Point: Average of midline points (10, 152, 168)
    const p10 = landmarks[10];
    const p152 = landmarks[152];
    const p168 = landmarks[168];

    if (!p10 || !p152 || !p168) {
        // Fallback or error?
        console.warn("Missing midline landmarks for symmetry calculation.");
        return map;
    }

    // Centroid of midline (Point on plane)
    const planePoint = { // P0
        x: (p10.x + p152.x + p168.x) / 3,
        y: (p10.y + p152.y + p168.y) / 3,
        z: (p10.z + p152.z + p168.z) / 3
    };

    // Normal Vector of the symmetry plane.
    // The plane passes through the midline.
    // The vector p10 -> p152 is DOWN the face (roughly Y axis).
    // To get the Normal (Right/Left axis), we need a Forward vector.
    // A vector pointing out of the face is roughly Cross(p10->p152, RightEye->LeftEye).
    // Or simpler: The Normal of the symmetry plane is roughly Cross(UpVector, ForwardVector).
    // Actually, the symmetry plane contains the UpVector (152->10) and the ForwardVector (Tip->In).
    // So the Normal of the symmetry plane is Perpendicular to the midline slice.
    // The Normal points from Left Ear to Right Ear.

    // Construct the Normal:
    // vUp = 10 - 152
    // vForward = 168 - (Deep point of head?). 
    // Easier: Cross Product of (152->10) and (152-> NoseTip(1))?
    // NoseTip is 1.
    const p1 = landmarks[1];

    // Vector V (Chin to Top) lies ON the plane.
    const vY = sub(p10, p152); // Approximately Up
    // Vector Z (Chin to Nose Tip) lies ON the plane (assuming nose is symmetric)
    const vZ = sub(p1, p152);

    // Normal X = Cross(vY, vZ) should be perpendicular to the symmetry plane.
    // This points to the side of the face.
    const planeNormal = normalize(cross(vY, vZ));

    // 2. Reflect points across the plane
    // P_reflected = P - 2 * dot(P - P0, n) * n

    for (let i = 0; i < landmarks.length; i++) {
        const p = landmarks[i];

        // Vector from Plane Point to P
        const v = sub(p, planePoint);
        // Distance to plane
        const dist = dot(v, planeNormal);

        // P_reflected = P - 2 * dist * n
        const reflection = sub(p, scaleVec(planeNormal, 2 * dist));

        let bestDist = Infinity;
        let bestIdx = -1;

        // Optimization: Brute force N^2 is 478*478 ~220k ops. 
        // JS can handle this in ~5ms.

        for (let j = 0; j < landmarks.length; j++) {
            // Symmetry is usually i != j, unless i is midline.

            const q = landmarks[j];
            // Euclidean distance between Q and Reflected P
            const d = (q.x - reflection.x) ** 2 + (q.y - reflection.y) ** 2 + (q.z - reflection.z) ** 2;

            if (d < bestDist) {
                bestDist = d;
                bestIdx = j;
            }
        }

        map[i] = bestIdx;
    }

    // Optional: Enforce Bijectivity? 
    // If Map[A] = B, ideally Map[B] = A.
    // But sometimes noise makes it Map[B] = C.
    // We can enforce reciprocity or just let it be tolerant.
    // "Copy Specular" usually means "Add Map[Selected]".

    return map;
}
