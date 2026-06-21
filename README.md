# Image to PDF Converter - Image to Compressed PDF Converter

Image to PDF Converter is a privacy-first, fully responsive web application that converts images into highly optimized, compressed PDF documents. All operations—including image cropping, rotation, text annotation, drawing signatures, and compression—happen **100% client-side in the browser**. No files are ever uploaded to a server, ensuring absolute confidentiality.

## ✨ Key Features

*   **🔒 100% Private & Local**: Images are processed locally on the client's device. Works completely offline.
*   **📸 Mobile Camera & WebRTC Support**: 
    *   Snaps high-quality pictures directly using native mobile device camera inputs (`capture="environment"`).
    *   Integrates an interactive WebRTC webcam stream preview modal for desktop users.
*   **🛠️ Interactive Document Editor (Page-by-Page)**:
    *   **Rotate**: Turn pages by 90-degree increments clockwise.
    *   **Crop**: Crop borders using responsive, high-precision slider margins.
    *   **Text Annotations**: Place resizable, draggable text labels in various colors and font sizes.
    *   **Draw & Sign**: Handwrite notes, highlight content, or sign documents directly on the image with adjustable brush size and color.
*   **📉 Smart Client-Side Compression**:
    *   Select from presets: **Low (Email-friendly)**, **Medium (Balanced)**, **High (Print quality)**, or **Original (Uncompressed)**.
    *   Fine-tune final document size using manual sliders for JPEG Quality and Resolution Downscaling.
*   **🔄 Easy Page Reordering**: Drag and drop page cards on desktop, or tap mobile-friendly directional controls to rearrange the page sequence.
*   **🎨 Premium Biophilic Design**: Features fluid cards, warm sand/slate color accents, seamless transition states, customized scrollbars, ambient glowing animations, and a dark/light mode toggle.

## 🛠️ Technology Stack

*   **Core Framework**: React 18 + TypeScript + Vite 5
*   **Styling**: Tailwind CSS + Custom CSS Transitions
*   **PDF Generation**: `pdf-lib` (compiled client-side)
*   **Icons**: `lucide-react`
*   **Success Micro-interaction**: `canvas-confetti`

## 🚀 Getting Started

### Prerequisites

Make sure you have Node.js (version 18.x or higher) installed.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/JackyZhiJie/Image-to-PDF-Converter.git
    cd Image-to-PDF-Converter
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running in Development Mode

Launch the local development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to test.

### Building for Production

Compile and bundle the project for deployment:
```bash
npm run build
```
Vite will output the optimized static build files into the `dist/` directory.

### 🌐 Deploying to GitHub Pages

Deploy the compiled site directly to your GitHub Pages branch:
```bash
npm run deploy
```
This script will build the project and publish the build assets directly to the `gh-pages` branch of your repository. Ensure you have push access to the repository.

## 📂 Project Structure

```text
├── index.html            # Main HTML mounting entry point
├── package.json          # Dependency configurations & scripts
├── tailwind.config.js    # Tailwind layout and theme configuration
├── tsconfig.json         # TypeScript configurations
├── src/
│   ├── App.tsx           # Dashboard container, webcam logic, and states
│   ├── main.tsx          # Application bootstrapper
│   ├── types/
│   │   └── index.ts      # TypeScript models and interfaces
│   ├── styles/
│   │   └── globals.css   # Main stylesheet with animations and custom fonts
│   ├── components/
│   │   ├── ImageCard.tsx   # Individual thumbnail cards with reorder/delete actions
│   │   └── EditorModal.tsx # Fullscreen editor modal (draw, text, crop, rotate)
│   └── utils/
│       └── pdfGenerator.ts # Canvas compilation and pdf-lib document generator
```

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
