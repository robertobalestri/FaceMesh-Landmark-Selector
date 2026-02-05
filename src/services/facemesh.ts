
import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;

export async function initFaceMesh() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: false,
        runningMode: "IMAGE",
        numFaces: 1
    });
    return faceLandmarker;
}

export function detectFace(image: HTMLImageElement): NormalizedLandmark[] | null {
    if (!faceLandmarker) {
        throw new Error("FaceLandmarker not initialized");
    }
    const result = faceLandmarker.detect(image);
    if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        return result.faceLandmarks[0];
    }
    return null;
}
