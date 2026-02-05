# MediaPipe FaceMesh Landmark Selector

A **React-based visual tool** for selecting, grouping, and exporting **MediaPipe Face Mesh landmarks** on custom images.

This app lets you **interactively pick from the 468 FaceMesh points**, organize them into reusable groups, and export clean JSON configurations for use in masks, filters, AR effects, or face analysis pipelines.

---

## Why this tool?

If you’ve worked with **MediaPipe FaceMesh**, you already know the pain:

- The face mesh has **468 landmarks**
- The official diagrams are **static and hard to interpret**
- Selecting landmark indices usually means:
  - Trial-and-error
  - Printing reference images
  - Guessing numbers
  - Writing temporary debug overlays
  - Repeating the process every time

### Common real-world problems this tool solves

#### 🎭 Face Masks & Filters
Want to build:
- Lipstick masks
- Eye shadow regions
- Face paint
- Beard or makeup filters

You need **exact landmark indices** for lips, eyelids, cheeks, and jawlines.  
This tool lets you **paint regions directly on the face** and export them as JSON.

#### 🤖 Face Analysis & Research
Perfect for:
- Emotion detection
- Facial symmetry analysis
- Region-based metrics
- Custom landmark clustering

Create **named, reusable landmark groups** with visual verification.

#### 🎮 AR / WebGL / Three.js Pipelines
Select landmarks for:
- Face-attached meshes
- Deformation zones
- UV mapping
- Face-following geometry

Export clean data ready for rendering pipelines.

#### 🧪 Prototyping & Debugging
Stop guessing landmark numbers.  
**See exactly what each index represents, instantly.**

---

## Features

### 🧠 Face Landmark Detection
- Automatically detects **468 MediaPipe Face Mesh landmarks**
- Works with custom uploaded images

### 🗂 Multi-Group Selection
- Create unlimited groups
- Rename, delete, reorder
- Toggle visibility per group
- Independent colors per group

### 🎨 Visual Selection Tools
- Brush selection (click & drag)
- Erase mode (`Shift`)
- Zoom & Pan (Mouse wheel / Middle click)
- Hover Inspection (Tooltip)
- Symmetry mirroring
- Inverse selection
- Color customization


### 📦 Import / Export
- Export selections as **JSON**
- Import saved configurations
- Share or version-control landmark sets

### 🖼 Image Support
- Upload custom images
- Default image included for testing

---

## Example Use Cases

### Example Export Structure

The exported JSON is a dictionary where keys are group names and values are arrays of landmark indices.

```json
{
  "Upper Lip": [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291],
  "Lower Lip": [146, 91, 181, 84, 17, 314, 405, 321, 375, 291],
  "Left Eye": [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153],
  "Nose Tip": [1]
}
```

---

## Tech Stack

- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Face Detection**: MediaPipe Face Mesh
- **Styling**: CSS Modules + Tailwind
- **Icons**: Lucide React

---

## Getting Started

### Prerequisites
- Node.js v18+
- npm or yarn

### Installation
```bash
git clone https://github.com/robertobalestri/FaceMesh-Landmark-Selector.git
cd FaceMesh-Landmark-Selector
npm install
```

### Development
```bash
npm run dev
```

Open http://localhost:5173

---

## Usage

1. Upload an image
2. Create selection groups
3. Brush-select landmarks
4. Refine with symmetry and visibility
5. Export JSON

---

## Roadmap
- **Undo/Redo History**: robust state management for selections.
- **Smart Presets**: Quickly select common regions (Lips, Eyes, Face Oval).
- **Wireframe Mode**: Visualize the face mesh connections.
- **Lasso Selection**: Select multiple points with a polygon tool.
- **Local Storage**: Auto-save your work to prevent data loss.
- **Image Export**: Download the annotated image as PNG.
- **UI Enhancements**: On-screen Zoom/Pan controls and improved tooltips.
- **Multi-face Support**: Handle images with multiple faces.

---

## License

MIT
