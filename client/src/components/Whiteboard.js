// ✅ Now includes Snap-to-Grid, arrows, shapes, undo/redo, and full styling support
import React, { useRef, useState } from "react";
import {
  Stage,
  Layer,
  Line,
  Text as KonvaText,
  Rect,
  Circle,
  Arrow,
  Image,
} from "react-konva";
import useImage from "use-image";
import { v4 as uuidv4 } from "uuid";

function UploadedImage({ img }) {
  const [image] = useImage(img.src);
  return <Image image={image} x={img.x} y={img.y} draggable />;
}

export default function SimpleWhiteboard() {
  const stageRef = useRef();
  const fileInputRef = useRef();

  const [tool, setTool] = useState("pen");
  const [lines, setLines] = useState([]);
  const [texts, setTexts] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [color, setColor] = useState("#000000");
  const [fillColor, setFillColor] = useState("transparent");
  const [lineWidth, setLineWidth] = useState(2);
  const [images, setImages] = useState([]);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const isDrawing = useRef(false);
  const startPoint = useRef(null);
  const gridSize = 20;

  const snap = (value) =>
    snapToGrid ? Math.round(value / gridSize) * gridSize : value;

  const saveHistory = (
    newLines,
    newImages = images,
    newTexts = texts,
    newShapes = shapes
  ) => {
    setHistory([...history, { lines, images, texts, shapes }]);
    setRedoStack([]);
    setLines(newLines);
    setImages(newImages);
    setTexts(newTexts);
    setShapes(newShapes);
  };

  const handleMouseDown = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    const x = snap(pos.x);
    const y = snap(pos.y);

    if (tool === "text") {
      if (!isDrawing.current) {
        isDrawing.current = true;
        const input = prompt("Enter text:", "");
        if (input) {
          const newText = { id: uuidv4(), text: input, x, y, fill: color };
          saveHistory(lines, images, [...texts, newText], shapes);
        }
        setTimeout(() => {
          isDrawing.current = false;
          setTool("pen");
        }, 0);
      }
      return;
    }

    if (["rect", "circle", "arrow"].includes(tool)) {
      startPoint.current = { x, y };
      return;
    }

    if (!["pen", "eraser"].includes(tool)) return;
    isDrawing.current = true;
    const newLine = {
      tool,
      points: [x, y],
      stroke: tool === "eraser" ? "white" : color,
      strokeWidth: lineWidth,
    };
    saveHistory([...lines, newLine], images, texts, shapes);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current) return;
    const point = e.target.getStage().getPointerPosition();
    const x = snap(point.x);
    const y = snap(point.y);
    setLines((lines) => {
      const lastLine = lines[lines.length - 1];
      const newPoints = lastLine.points.concat([x, y]);
      const updatedLine = { ...lastLine, points: newPoints };
      return [...lines.slice(0, -1), updatedLine];
    });
  };

  const handleMouseUp = (e) => {
    isDrawing.current = false;
    const pos = e.target.getStage().getPointerPosition();
    const x2 = snap(pos.x);
    const y2 = snap(pos.y);

    if (startPoint.current && ["rect", "circle", "arrow"].includes(tool)) {
      const { x, y } = startPoint.current;
      const newShape = {
        id: uuidv4(),
        type: tool,
        x,
        y,
        x2,
        y2,
        stroke: color,
        fill: fillColor,
        strokeWidth: lineWidth,
      };
      setShapes((prev) => [...prev, newShape]);
      setHistory([...history, { lines, images, texts, shapes }]);
      startPoint.current = null;
    }
  };

  const handleClear = () => {
    saveHistory([], [], [], []);
  };

  const handleDownload = () => {
    const choice = prompt(
      "Download as:\n1 = Transparent\n2 = White Background\n3 = With Grid",
      "2"
    );
    const stage = stageRef.current;
    const originalGrid = showGrid;
    let uri;

    if (choice === "1") {
      uri = stage.toDataURL({ pixelRatio: 3 });
    } else {
      if (choice === "2") setShowGrid(false);
      const bgLayer = document.createElement("canvas");
      bgLayer.width = stage.width();
      bgLayer.height = stage.height();
      const ctx = bgLayer.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, bgLayer.width, bgLayer.height);

      const temp = new window.Image();
      temp.onload = () => {
        ctx.drawImage(temp, 0, 0);
        const link = document.createElement("a");
        link.download = "whiteboard.png";
        link.href = bgLayer.toDataURL();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setShowGrid(originalGrid);
      };
      temp.src = stage.toDataURL({ pixelRatio: 3 });
      return;
    }

    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newImg = {
        id: uuidv4(),
        src: reader.result,
        x: snap(100),
        y: snap(100),
      };
      saveHistory(lines, [...images, newImg], texts, shapes);
    };
    reader.readAsDataURL(file);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = [...history];
    const last = prev.pop();
    setRedoStack([{ lines, images, texts, shapes }, ...redoStack]);
    setHistory(prev);
    setLines(last.lines);
    setImages(last.images);
    setTexts(last.texts);
    setShapes(last.shapes);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const [next, ...rest] = redoStack;
    setHistory([...history, { lines, images, texts, shapes }]);
    setLines(next.lines);
    setImages(next.images);
    setTexts(next.texts);
    setShapes(next.shapes);
    setRedoStack(rest);
  };

  const renderGrid = () => {
    const stage = stageRef.current;
    if (!stage) return null;
    const width = stage.width();
    const height = stage.height();
    const gridLines = [];
    for (let i = gridSize; i < width; i += gridSize) {
      gridLines.push(
        <Line
          key={`v-${i}`}
          points={[i, 0, i, height]}
          stroke="#ddd"
          globalCompositeOperation="source-over"
          listening={false}
        />
      );
    }
    for (let j = gridSize; j < height; j += gridSize) {
      gridLines.push(
        <Line
          key={`h-${j}`}
          points={[0, j, width, j]}
          stroke="#ddd"
          globalCompositeOperation="source-over"
          listening={false}
        />
      );
    }
    return gridLines;
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setTool("pen")}>Pen</button>
        <button onClick={() => setTool("eraser")}>Eraser</button>
        <button onClick={() => setTool("text")}>Text</button>
        <button onClick={() => setTool("rect")}>Rectangle</button>
        <button onClick={() => setTool("circle")}>Circle</button>
        <button onClick={() => setTool("arrow")}>Arrow</button>
        <button onClick={handleClear}>Clear</button>
        <button onClick={handleDownload}>Download</button>
        <button onClick={() => fileInputRef.current.click()}>
          Upload Image
        </button>
        <button onClick={handleUndo}>Undo</button>
        <button onClick={handleRedo}>Redo</button>
        <label>
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={() => setSnapToGrid(!snapToGrid)}
          />{" "}
          Snap-to-grid
        </label>
        <label>
          <input
            type="checkbox"
            checked={showGrid}
            onChange={() => setShowGrid(!showGrid)}
          />{" "}
          Show Grid
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleImageUpload}
        />
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          type="color"
          value={fillColor}
          onChange={(e) => setFillColor(e.target.value)}
        />
        <input
          type="range"
          min="1"
          max="20"
          value={lineWidth}
          onChange={(e) => setLineWidth(Number(e.target.value))}
        />
      </div>

      <Stage
        width={Math.min(window.innerWidth - 40, window.innerWidth * 0.95)}
        height={Math.min(window.innerHeight - 160, window.innerHeight * 0.85)}
        ref={stageRef}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        style={{ border: "2px solid #007bff", borderRadius: "8px" }}
      >
        <Layer>
          {showGrid && renderGrid()}
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke={line.stroke}
              strokeWidth={line.strokeWidth}
              tension={0.5}
              lineCap="round"
              globalCompositeOperation={
                line.tool === "eraser" ? "destination-out" : "source-over"
              }
            />
          ))}
          {shapes.map((shape) => {
            const props = {
              key: shape.id,
              x: shape.x,
              y: shape.y,
              stroke: shape.stroke,
              fill: shape.fill,
              strokeWidth: shape.strokeWidth,
              draggable: true,
            };
            if (shape.type === "rect") {
              return (
                <Rect
                  {...props}
                  width={shape.x2 - shape.x}
                  height={shape.y2 - shape.y}
                />
              );
            } else if (shape.type === "circle") {
              const radius =
                Math.hypot(shape.x2 - shape.x, shape.y2 - shape.y) / 2;
              return (
                <Circle {...props} radius={radius} x={shape.x} y={shape.y} />
              );
            } else if (shape.type === "arrow") {
              return (
                <Arrow
                  {...props}
                  points={[shape.x, shape.y, shape.x2, shape.y2]}
                />
              );
            }
            return null;
          })}
          {texts.map((t) => (
            <KonvaText
              key={t.id}
              text={t.text}
              x={t.x}
              y={t.y}
              fill={t.fill}
              fontSize={20}
              draggable
            />
          ))}
          {images.map((img) => (
            <UploadedImage key={img.id} img={img} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
