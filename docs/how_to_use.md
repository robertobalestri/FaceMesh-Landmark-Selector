# FaceMesh Landmark Selector - User Manual

Welcome to the **MediaPipe FaceMesh Landmark Selector**! This tool allows you to easily load images, auto-detect 478 MediaPipe FaceMesh points, group them, tweak/nudge coordinates, and export selections to various formats for AR filter tools (Spark AR, Lens Studio, TikTok Effect House, etc.) or machine learning models.

---

## 1. Quick Start

1. **Start the Application**: Ensure your local development server is running (`npm run dev`) and open the application in your browser.
2. **Choose or Upload an Image**:
   * The app initializes with a default test portrait.
   * To use your own image, click **New Image** or **Upload Image** at the bottom of the sidebar.
3. **Wait for Auto-Detection**: MediaPipe FaceMesh will run in the background and overlay small dot markers across the detected face within a few seconds (supporting the full 478-point mesh including pupils).

---

## 2. Canvas Navigation & Controls

The canvas supports full interactive pan and zoom to help you target precise details:

| Action | Control | Description |
|---|---|---|
| **Zoom In/Out** | **Scroll Wheel** | Zooms centered on the position of your mouse cursor. |
| **Pan Canvas** | **Mouse Wheel Click** or **Shift + Left Click** | Hold down and drag your mouse to pan around the image. |
| **Brush Select / Add** | **Left Click & Drag** (in Brush Mode) | Paints/adds landmarks inside the brush circle. |
| **Brush Remove** | **Right Click & Drag** (in Brush Mode) | Subtracts/removes landmarks inside the brush circle. |
| **Lasso Add Point** | **Left Click** (in Lasso Mode) | Places a polygon vertex at the clicked position. |
| **Lasso Close & Select** | **Double Click** (in Lasso Mode) | Closes the polygon path and selects all landmarks inside. |
| **Lasso Cancel** | **Escape Key** | Clears the active lasso path. |

---

## 3. Tool Modes (Brush vs. Lasso vs. Move)

The editor operates in three primary modes via the **Tool Mode** toggle in the sidebar:

### A. Brush Select Mode
Used to select or deselect landmark indices using a paint-brush cursor:
* **Brush Size**: Drag the slider to adjust the selection radius.
* **Selection Mode**:
  * **Add**: Left-click and drag to paint landmarks into the active group.
  * **Sub**: Left-click and drag to remove painted landmarks.
  * *(Shortcut: You can always use Right-click to subtract, regardless of the active selection mode).*

### B. Lasso Select Mode
Used to select multiple landmarks inside a freeform drawn polygon:
* **Draw Contour**: Left-click on the canvas to place successive boundary vertices. A cyan outline shows the selection contour.
* **Confirm Selection**: Double-click to close the polygon. All landmarks lying within the polygon will be selected/deselected based on the active selection mode (Add/Sub).
* **Reset Path**: Press the `Escape` key to discard the current lasso outline.

### C. Move (Transform) Mode
Allows you to visually edit landmark positions directly on the canvas using your mouse:
* **Hover Landmark**: Hover your cursor near any point on the canvas. A teal highlight ring will appear around the target point, and the cursor will change to a grab hand.
* **Drag Landmark**: Left-click and drag a point to adjust its offset position.
* **Symmetric Drag Toggle (🪞)**: In Transform mode, a floating button labeled **Symmetric Drag: ON/OFF** appears on the right side of the canvas.
  * **When ON**: Dragging a landmark automatically moves its anatomically mirrored counterpart symmetrically (e.g. moving a left eye corner outward moves the right eye corner outward).
  * **When OFF**: Dragging a landmark only affects that individual point.

---

## 4. Selection Groups

Organize selections into named groups (e.g., "Left Eyelash", "Lip Inner Outline"):

* **Create Group**: Click the **`+` (Plus)** button next to the "Groups" label.
* **Active Group**: Click on any group card in the sidebar. Active selections will automatically belong to this group.
* **Change Color**: Click the round color dot on the group card to change its display color on the canvas.
* **Toggle Visibility**: Click the Eye icon to show/hide that group's landmarks on the canvas.
* **Rename Group**: Double-click the group's name, type a new name, and click the Checkmark icon (or press `Enter`).
* **Delete Group**: Click the Trash icon on the group card.

---

## 5. Smart Tools & Features

### ✨ Smart Presets & 478 Attention Mesh
Click the **Smart Presets** button to select preset landmark groups.
* **Irises Preset**: Includes the high-resolution iris and pupil landmarks (indices `468` to `477`) of the MediaPipe 478 Attention Mesh.
* Standard presets for Lips, Upper/Lower Lip, Left/Right Eye, Left/Right Eyebrow, and Face Oval are also available.

### Specular Mirroring
Click the **Specular** button under *Actions* to mirror the active group's selections symmetrically to the other side of the face (e.g. duplicating a left eye selection to the right eye).

### Inverse Selection
Click **Inverse** to deselect all currently selected landmarks in the group and select all other landmarks on the face.

### Clear Selection
Click **Clear** (Trash icon) to remove all points from the active group.

### Wireframe Mesh Toggle
Toggle **Show Mesh Wireframe / Hide Mesh Wireframe** to overlay the default MediaPipe FaceMesh wireframe triangulation map.

### Transform Group (Nudge)
Use the Directional Arrow Pad under **Transform Group** to nudge all landmarks in the active group up, down, left, or right. This allows you to fine-tune point offsets directly.

---

## 6. WebGL 3D Viewport

Toggle **Show 3D View** in the *View Options* panel of the sidebar to activate a split-screen WebGL interactive canvas.
* **Rotate Scene**: Left-click and drag inside the WebGL viewport.
* **Pan Scene**: Right-click and drag inside the WebGL viewport.
* **Zoom**: Use your mouse scroll wheel.
* **Live Texture Projection**: The uploaded face image is projected dynamically onto the 3D geometry. Real-time landmark adjustments made in the 2D Canvas deform the 3D head mesh immediately.
* **Visual Selection Markers**: Selection groups show up as glowing 3D spheres styled with the group's color in the 3D scene (including iris/pupil tracking points).

---

## 7. Import & Export

Refer to the [Data Export Guide](export.md) for full formatting details.

* **Export**: Select the format from the dropdown (Indices, Coordinates, or AR platform-specific profiles) and click **Export All**.
* **Import**: Click **Import JSON** to load a previously exported JSON file. The application will reconstruct your groups and indices instantly.

---

## 8. Workspace Persistence & Resetting

* **Automatic Saving**: Every selection group creation, indices change, visibility toggle, color update, and landmark offset adjustment is saved automatically to the browser's `localStorage` in real time. If the page is refreshed or closed, the exact workspace state will restore upon opening.
* **Reset Workspace**: To clear all groups, active selections, and transform offsets back to the clean default state, click the red **Reset Workspace** button at the bottom of the sidebar and confirm the prompt.
