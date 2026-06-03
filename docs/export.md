# FaceMesh Landmark Selector - Data Export Guide

This document describes in detail how the data export features work, the available formats, and the exact structure of the output files.

---

## 1. Export Formats Overview

The FaceMesh Landmark Selector supports exporting active selections and adjusted coordinate positions in multiple formats:

1. **Indices-Only Formats**
   * **JSON (Indices)**: Standard JSON mapping group names to arrays of landmark index numbers.
   * **CSV (Indices)**: A comma-separated values file listing groups and their selected indices.
   * **TXT (Indices)**: A human-readable text document grouping indices by selection group.

2. **Coordinate Formats (Includes Nudges/Offsets)**
   * **JSON (Normalized Coords)**: Exports 3D coordinate objects ($x$, $y$, $z$) with any applied transform offsets, normalized to $[0.0, 1.0]$.
   * **JSON (Pixel Coords)**: Exports 3D coordinate objects scaled to the image's raw resolution (pixels) with applied offsets.
   * **CSV (Normalized Coords)**: A flat spreadsheet listing group names, indices, and normalized $x, y, z$ coordinates.
   * **CSV (Pixel Coords)**: A flat spreadsheet listing group names, indices, and pixel-space $x, y, z$ coordinates.

---

## 2. Nudge & Offset Math

When you nudge or shift landmarks using the **Transform Group** controls in the sidebar, the application applies pixel-based offsets ($dx, dy$) to the base landmarks. The export system processes these offsets as follows:

### Normalized Coordinate Export
Normalized coordinate values are relative to the image bounds, where $(0,0)$ is top-left and $(1,1)$ is bottom-right.
$$\text{Exported } X = X_{\text{base}} + \left(\frac{dx}{\text{Image Width}}\right)$$
$$\text{Exported } Y = Y_{\text{base}} + \left(\frac{dy}{\text{Image Height}}\right)$$
$$\text{Exported } Z = Z_{\text{base}}$$
*(Note: $z$ is unadjusted since nudges are applied in 2D screenspace.)*

### Pixel Coordinate Export
Pixel coordinates represent absolute positions in the raw image texture.
$$\text{Exported } X = (X_{\text{base}} \times \text{Image Width}) + dx$$
$$\text{Exported } Y = (Y_{\text{base}} \times \text{Image Height}) + dy$$
$$\text{Exported } Z = Z_{\text{base}} \times \text{Image Width}$$
*(Note: $z$ is scaled proportionally to the image width to maintain consistent 3D depth units.)*

---

## 3. Detailed File Structure Examples

### JSON (Indices)
* **Filename**: `landmarks_groups.json`
* **Structure**: Maps group names directly to arrays of integers sorted ascending.
```json
{
  "Left Eye": [33, 133, 153, 154, 155, 157, 158, 159, 160, 161, 173, 246],
  "Lips": [0, 17, 37, 39, 40, 61, 84, 91, 146, 181, 185, 267, 269, 270, 291, 314, 321, 375, 405, 409]
}
```

### JSON (Normalized Coordinates)
* **Filename**: `landmarks_groups_normalized_coords.json`
* **Structure**: Maps group names to array of coordinate objects.
```json
{
  "Left Eye": [
    {
      "index": 33,
      "x": 0.354122,
      "y": 0.449871,
      "z": -0.019543
    },
    {
      "index": 133,
      "x": 0.389104,
      "y": 0.450212,
      "z": -0.012395
    }
  ]
}
```

### JSON (Pixel Coordinates)
* **Filename**: `landmarks_groups_pixel_coords.json`
* **Structure**: Same schema as normalized JSON, but values represent absolute pixels on the uploaded image.
```json
{
  "Left Eye": [
    {
      "index": 33,
      "x": 362.62,
      "y": 460.67,
      "z": -20.01
    },
    {
      "index": 133,
      "x": 398.44,
      "y": 461.02,
      "z": -12.69
    }
  ]
}
```

### CSV (Indices)
* **Filename**: `landmarks_groups.csv`
* **Structure**: Two columns (`Group Name` and comma-separated `Indices`).
```csv
Group Name,Indices
"Left Eye","33,133,153,154,155,157,158,159,160,161,173,246"
"Lips","0,17,37,39,40,61,84,91,146,181,185,267,269,270,291,314,321,375,405,409"
```

### CSV (Normalized Coordinates)
* **Filename**: `landmarks_groups_normalized_coords.csv`
* **Structure**: Columnar structure mapping each landmark individually to its normalized float position.
```csv
Group Name,Index,X (Normalized),Y (Normalized),Z
"Left Eye",33,0.354122,0.449871,-0.019543
"Left Eye",133,0.389104,0.450212,-0.012395
```

### CSV (Pixel Coordinates)
* **Filename**: `landmarks_groups_pixel_coords.csv`
* **Structure**: Columnar structure mapping each landmark to its pixel coordinate.
```csv
Group Name,Index,X (Pixel),Y (Pixel),Z (Scaled)
"Left Eye",33,362.62,460.67,-20.01
"Left Eye",133,398.44,461.02,-12.69
```

### TXT (Indices)
* **Filename**: `landmarks_groups.txt`
* **Structure**: Clean plain text format grouped with bracket headers.
```text
[Left Eye]
33, 133, 153, 154, 155, 157, 158, 159, 160, 161, 173, 246

[Lips]
0, 17, 37, 39, 40, 61, 84, 91, 146, 181, 185, 267, 269, 270, 291, 314, 321, 375, 405, 409
```

---

## 4. AR Platform Export Profiles

To facilitate seamless importing into popular AR development engines, the application offers custom coordinate mapping profiles. In all profiles, coordinates are centered to the face mesh centroid, converting coordinates from Y-down (image coordinates) to Y-up (standard 3D engine coordinate system) and Z-out (pointing towards the camera).

### A. Spark AR (Meta)
* **Filename**: `landmarks_groups_spark_ar.json`
* **Coordinate System**: Y-up, Z-out (right-handed).
* **Format**: Maps groups to landmark coordinate objects containing indices.
```json
{
  "spark_ar_profile": {
    "metadata": {
      "coordinate_system": "Y-up, Z-out (right-handed)",
      "centered": true,
      "unit": "normalized-face-scale"
    },
    "groups": {
      "Lips": [
        {
          "index": 0,
          "x": -0.000305,
          "y": -0.046394,
          "z": 0.051939
        }
      ]
    }
  }
}
```

### B. Lens Studio (Snapchat)
* **Filename**: `landmarks_groups_lens_studio.json`
* **Coordinate System**: Y-up, Z-out (right-handed).
* **Format**: Maps groups to lists of indices and corresponding coordinates.
```json
{
  "lens_studio_profile": {
    "metadata": {
      "coordinate_system": "Y-up, Z-out (right-handed)",
      "centered": true,
      "unit": "normalized-face-scale"
    },
    "groups": {
      "Lips": {
        "indices": [0, 17],
        "points": [
          {
            "x": -0.000305,
            "y": -0.046394,
            "z": 0.051939
          }
        ]
      }
    }
  }
}
```

### C. TikTok (Effect House)
* **Filename**: `landmarks_groups_tiktok.json`
* **Coordinate System**: Y-up, Z-out (right-handed).
* **Format**: Maps groups to indices and flat coordinate arrays of `[x, y, z]` for script consumption.
```json
{
  "tiktok_profile": {
    "metadata": {
      "coordinate_system": "Y-up, Z-out (right-handed)",
      "centered": true,
      "unit": "normalized-face-scale"
    },
    "groups": {
      "Lips": {
        "indices": [0, 17],
        "coords": [
          -0.000305,
          -0.046394,
          0.051939
        ]
      }
    }
  }
}
```
