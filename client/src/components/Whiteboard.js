import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Arrow,
  Text as KonvaText,
  Image as KonvaImage,
  Line,
  Transformer,
} from "react-konva";
import useImage from "use-image";
import "../styles/Whiteboard.css";

// Helper for uploaded images
const UploadedImage = ({ shapeProps, isSelected, onSelect, onChange }) => {
  const [image] = useImage(shapeProps.src);
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaImage
        image={image}
        ref={shapeRef}
        {...shapeProps}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) =>
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          })
        }
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * node.scaleX()),
            height: Math.max(5, node.height() * node.scaleY()),
            scaleX: 1,
            scaleY: 1,
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && <Transformer ref={trRef} flipEnabled={false} />}
    </>
  );
};

// Aspect ratio utility (16:9)
function getStageSize() {
  let width = Math.min(window.innerWidth - 40, 1200);
  width = Math.max(width, 600);
  let height = Math.round(width / (16 / 9));
  height = Math.max(height, 350);
  height = Math.min(height, 700);
  return { width, height };
}

export default function Whiteboard() {
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#22223b");
  const [fillColor, setFillColor] = useState("#ffffff00");
  const [lineWidth, setLineWidth] = useState(4);
  const [lines, setLines] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [texts, setTexts] = useState([]);
  const [images, setImages] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [stageSize, setStageSize] = useState(getStageSize());

  const [selectedId, setSelectedId] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [textEditValue, setTextEditValue] = useState("");
  const [addingText, setAddingText] = useState(false);

  const stageRef = useRef();
  const transformerRef = useRef();

  // Responsive canvas with aspect ratio
  useEffect(() => {
    const handleResize = () => setStageSize(getStageSize());
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Undo/redo helpers
  const pushToUndo = useCallback(() => {
    setUndoStack((stack) => [
      ...stack,
      {
        lines: [...lines],
        shapes: [...shapes],
        texts: [...texts],
        images: [...images],
      },
    ]);
    setRedoStack([]);
  }, [lines, shapes, texts, images]);

  const applyHistory = (historyItem) => {
    if (historyItem) {
      setLines(historyItem.lines);
      setShapes(historyItem.shapes);
      setTexts(historyItem.texts);
      setImages(historyItem.images);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((stack) => [
      ...stack,
      {
        lines: [...lines],
        shapes: [...shapes],
        texts: [...texts],
        images: [...images],
      },
    ]);
    applyHistory(prev);
    setUndoStack((stack) => stack.slice(0, -1));
    setSelectedId(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((stack) => [
      ...stack,
      {
        lines: [...lines],
        shapes: [...shapes],
        texts: [...texts],
        images: [...images],
      },
    ]);
    applyHistory(next);
    setRedoStack((stack) => stack.slice(0, -1));
    setSelectedId(null);
  };

  // Mouse handlers
  const handleMouseDown = (e) => {
    const pos = stageRef.current.getPointerPosition();
    if (tool === "pen" || tool === "eraser") {
      pushToUndo();
      setIsDrawing(true);
      setLines((lines) => [
        ...lines,
        {
          tool,
          points: [pos.x, pos.y],
          color: tool === "eraser" ? "#fff" : color,
          width: lineWidth,
          id: "line" + Date.now(),
        },
      ]);
      setSelectedId(null);
    } else if (tool === "rect" || tool === "circle") {
      pushToUndo();
      setIsDrawing(true);
      const id = tool + Date.now();
      setShapes((shapes) => [
        ...shapes,
        {
          id,
          type: tool,
          x: pos.x,
          y: pos.y,
          x2: pos.x,
          y2: pos.y,
          stroke: color,
          fill: fillColor,
          strokeWidth: lineWidth,
        },
      ]);
      setSelectedId(id);
    } else if (tool === "arrow") {
      pushToUndo();
      setIsDrawing(true);
      const id = "arrow" + Date.now();
      setShapes((shapes) => [
        ...shapes,
        {
          id,
          type: "arrow",
          x: pos.x,
          y: pos.y,
          x2: pos.x,
          y2: pos.y,
          stroke: color,
          fill: color,
          strokeWidth: lineWidth,
        },
      ]);
      setSelectedId(id);
    } else if (tool === "text") {
      if (!addingText) {
        pushToUndo();
        const id = "text" + Date.now();
        setTexts((texts) => [
          ...texts,
          {
            id,
            text: "",
            x: pos.x,
            y: pos.y,
            fill: color,
          },
        ]);
        setSelectedId(id);
        setEditingTextId(id);
        setTextEditValue("");
        setAddingText(true);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = stageRef.current.getPointerPosition();
    if (tool === "pen" || tool === "eraser") {
      setLines((lines) =>
        lines.map((line, i) =>
          i === lines.length - 1
            ? {
                ...line,
                points: [...line.points, pos.x, pos.y],
              }
            : line
        )
      );
    } else if (tool === "rect" || tool === "circle" || tool === "arrow") {
      setShapes((shapes) =>
        shapes.map((shape, i) =>
          i === shapes.length - 1 ? { ...shape, x2: pos.x, y2: pos.y } : shape
        )
      );
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (tool === "arrow" || tool === "rect" || tool === "circle") {
      setTool("select");
    }
    if (tool === "text") {
      setAddingText(false);
      setTool("select");
    }
  };

  // Snap to grid
  const snap = (v) => (snapToGrid ? Math.round(v / 20) * 20 : v);

  // Text handlers
  const handleTextDblClick = (t) => {
    setEditingTextId(t.id);
    setTextEditValue(t.text);
    setSelectedId(t.id);
  };

  const handleTextEdit = () => {
    setTexts((texts) =>
      texts.map((t) =>
        t.id === editingTextId ? { ...t, text: textEditValue } : t
      )
    );
    setEditingTextId(null);
    setTextEditValue("");
    setTool("pen");
    setAddingText(false);
  };

  // Object eraser: removes any object on click
  const handleObjectEraser = (id, type) => {
    pushToUndo();
    if (type === "shape")
      setShapes((shapes) => shapes.filter((s) => s.id !== id));
    else if (type === "text")
      setTexts((texts) => texts.filter((t) => t.id !== id));
    else if (type === "image")
      setImages((images) => images.filter((img) => img.id !== id));
    setSelectedId(null);
  };

  // Image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pushToUndo();
      const id = "img" + Date.now();
      setImages([
        ...images,
        {
          id,
          src: reader.result,
          x: 100,
          y: 100,
          width: 150,
          height: 100,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          type: "image",
        },
      ]);
      setSelectedId(id);
      setTool("select");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Download/export
  const handleDownload = (bg = "white", withGrid = false) => {
    setShowGrid(withGrid);
    setTimeout(() => {
      const uri = stageRef.current.toDataURL({
        pixelRatio: 2,
        mimeType: "image/png",
        backgroundColor: bg === "transparent" ? null : bg,
      });
      const link = document.createElement("a");
      link.download = "whiteboard.png";
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (!withGrid) setShowGrid(false);
    }, 100); // allow grid to render if needed
  };

  // Clear canvas
  const handleClear = () => {
    pushToUndo();
    setLines([]);
    setShapes([]);
    setTexts([]);
    setImages([]);
    setSelectedId(null);
  };

  // Deselect on empty area click
  const handleStageMouseDown = (e) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
      setEditingTextId(null);
      return;
    }
    // Drawing logic:
    const pos = stageRef.current.getPointerPosition();
    if (tool === "pen" || tool === "eraser") {
      pushToUndo();
      setIsDrawing(true);
      setLines((lines) => [
        ...lines,
        {
          tool,
          points: [pos.x, pos.y],
          color: tool === "eraser" ? "#fff" : color,
          width: lineWidth,
          id: "line" + Date.now(),
        },
      ]);
      setSelectedId(null);
    } else if (tool === "rect" || tool === "circle") {
      pushToUndo();
      setIsDrawing(true);
      const id = tool + Date.now();
      setShapes((shapes) => [
        ...shapes,
        {
          id,
          type: tool,
          x: pos.x,
          y: pos.y,
          x2: pos.x,
          y2: pos.y,
          stroke: color,
          fill: fillColor,
          strokeWidth: lineWidth,
        },
      ]);
      setSelectedId(id);
    } else if (tool === "arrow") {
      pushToUndo();
      setIsDrawing(true);
      const id = "arrow" + Date.now();
      setShapes((shapes) => [
        ...shapes,
        {
          id,
          type: "arrow",
          x: pos.x,
          y: pos.y,
          x2: pos.x,
          y2: pos.y,
          stroke: color,
          fill: color,
          strokeWidth: lineWidth,
        },
      ]);
      setSelectedId(id);
    } else if (tool === "text") {
      if (!addingText) {
        pushToUndo();
        const id = "text" + Date.now();
        setTexts((texts) => [
          ...texts,
          {
            id,
            text: "",
            x: pos.x,
            y: pos.y,
            fill: color,
          },
        ]);
        setSelectedId(id);
        setEditingTextId(id);
        setTextEditValue("");
        setAddingText(true);
      }
    }
  };

  // Keyboard delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Delete" && selectedId) {
        pushToUndo();
        setLines((lines) => lines.filter((l) => l.id !== selectedId));
        setShapes((shapes) => shapes.filter((s) => s.id !== selectedId));
        setTexts((texts) => texts.filter((t) => t.id !== selectedId));
        setImages((images) => images.filter((img) => img.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, pushToUndo]);

  // Transformer logic for shapes and texts
  useEffect(() => {
    if (transformerRef.current && selectedId) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId, lines, shapes, texts, images]);

  // Grid lines
  const gridLines = [];
  if (showGrid) {
    for (let i = 0; i < stageSize.width / 20; i++) {
      gridLines.push(
        <Rect
          key={"v" + i}
          x={i * 20}
          y={0}
          width={1}
          height={stageSize.height}
          fill="#eee"
          listening={false}
        />
      );
    }
    for (let j = 0; j < stageSize.height / 20; j++) {
      gridLines.push(
        <Rect
          key={"h" + j}
          x={0}
          y={j * 20}
          width={stageSize.width}
          height={1}
          fill="#eee"
          listening={false}
        />
      );
    }
  }

  return (
    <div
      className="whiteboard-container"
      style={{ overflow: "hidden", maxWidth: "100vw" }}
    >
      <div className="whiteboard-toolbar">
        <button
          className={tool === "pen" ? "active" : ""}
          onClick={() => setTool("pen")}
        >
          Pen
        </button>
        <button
          className={tool === "eraser" ? "active" : ""}
          onClick={() => setTool("eraser")}
        >
          Eraser
        </button>
        <button
          className={tool === "rect" ? "active" : ""}
          onClick={() => setTool("rect")}
        >
          Rectangle
        </button>
        <button
          className={tool === "circle" ? "active" : ""}
          onClick={() => setTool("circle")}
        >
          Circle
        </button>
        <button
          className={tool === "arrow" ? "active" : ""}
          onClick={() => setTool("arrow")}
        >
          Arrow
        </button>
        <button
          className={tool === "text" ? "active" : ""}
          onClick={() => setTool("text")}
        >
          Text
        </button>
        <button onClick={handleClear}>Clear</button>
        <button onClick={() => handleDownload("white", false)}>Download</button>
        <button onClick={() => handleDownload("transparent", false)}>
          Download Transparent
        </button>
        <button onClick={() => handleDownload("white", true)}>
          Download with Grid
        </button>
        <button onClick={handleUndo} disabled={undoStack.length === 0}>
          Undo
        </button>
        <button onClick={handleRedo} disabled={redoStack.length === 0}>
          Redo
        </button>
        <button
          className={snapToGrid ? "active" : ""}
          onClick={() => setSnapToGrid((s) => !s)}
        >
          Snap to Grid
        </button>
        <button
          className={showGrid ? "active" : ""}
          onClick={() => setShowGrid((s) => !s)}
        >
          Show Grid
        </button>
        <label>
          <span style={{ marginRight: 4 }}>Line</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <label>
          <span style={{ marginRight: 4 }}>Fill</span>
          <input
            type="color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
          />
        </label>
        <label>
          <span style={{ marginRight: 4 }}>Width</span>
          <input
            type="range"
            min="2"
            max="24"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
          />
        </label>
        <label className="image-upload-btn">
          Upload Image
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
        </label>
      </div>
      <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleStageMouseDown}
          onTouchStart={handleMouseDown}
          onMouseDown={handleMouseDown}
          onTouchMove={handleMouseMove}
          onMouseMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          onMouseUp={handleMouseUp}
          style={{
            background: "#fff",
            borderRadius: 8,
            border: "2px solid #007bff",
            width: "100%",
            boxSizing: "border-box",
            display: "block",
            margin: "0 auto",
          }}
        >
          <Layer>
            {gridLines}
            {lines.map((line) => (
              <Line
                key={line.id}
                id={line.id}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.width}
                tension={0.5}
                lineCap="round"
                globalCompositeOperation={
                  line.tool === "eraser" ? "destination-out" : "source-over"
                }
              />
            ))}
            {shapes.map((shape) => {
              const shapeProps = {
                key: shape.id,
                id: shape.id,
                x: snap(shape.x),
                y: snap(shape.y),
                stroke: shape.stroke,
                fill: shape.fill,
                strokeWidth: shape.strokeWidth,
                draggable: true,
                onClick:
                  tool === "eraser"
                    ? () => handleObjectEraser(shape.id, "shape")
                    : () => setSelectedId(shape.id),
                onTap:
                  tool === "eraser"
                    ? () => handleObjectEraser(shape.id, "shape")
                    : () => setSelectedId(shape.id),
                onDragEnd: (e) => {
                  pushToUndo();
                  setShapes((shapes) =>
                    shapes.map((s) =>
                      s.id === shape.id
                        ? { ...s, x: snap(e.target.x()), y: snap(e.target.y()) }
                        : s
                    )
                  );
                },
                onTransformEnd: (e) => {
                  pushToUndo();
                  const node = stageRef.current.findOne(`#${shape.id}`);
                  if (shape.type === "rect") {
                    setShapes((shapes) =>
                      shapes.map((s) =>
                        s.id === shape.id
                          ? {
                              ...s,
                              x: snap(node.x()),
                              y: snap(node.y()),
                              width: Math.max(5, node.width() * node.scaleX()),
                              height: Math.max(
                                5,
                                node.height() * node.scaleY()
                              ),
                              scaleX: 1,
                              scaleY: 1,
                            }
                          : s
                      )
                    );
                  } else if (shape.type === "circle") {
                    setShapes((shapes) =>
                      shapes.map((s) =>
                        s.id === shape.id
                          ? {
                              ...s,
                              x: snap(node.x()),
                              y: snap(node.y()),
                              radius: Math.max(
                                5,
                                node.radius() * node.scaleX()
                              ),
                              scaleX: 1,
                              scaleY: 1,
                            }
                          : s
                      )
                    );
                  } else if (shape.type === "arrow") {
                    // Optionally: update arrow points if you want to allow resizing arrows
                  }
                  setSelectedId(shape.id);
                },
              };
              if (shape.type === "rect") {
                return (
                  <Rect
                    {...shapeProps}
                    width={Math.abs(shape.x2 - shape.x)}
                    height={Math.abs(shape.y2 - shape.y)}
                  />
                );
              } else if (shape.type === "circle") {
                const radius =
                  Math.hypot(shape.x2 - shape.x, shape.y2 - shape.y) / 2;
                return <Circle {...shapeProps} radius={radius} />;
              } else if (shape.type === "arrow") {
                return (
                  <Arrow
                    {...shapeProps}
                    points={[shape.x, shape.y, shape.x2, shape.y2]}
                    pointerLength={15}
                    pointerWidth={15}
                  />
                );
              }
              return null;
            })}
            {texts.map((t) =>
              editingTextId === t.id ? (
                <foreignObject
                  key={t.id}
                  x={t.x}
                  y={t.y}
                  width={300}
                  height={50}
                >
                  <input
                    style={{
                      fontSize: 20,
                      width: 250,
                      padding: 4,
                      borderRadius: 4,
                      border: "1px solid #007bff",
                    }}
                    value={textEditValue}
                    autoFocus
                    onChange={(e) => setTextEditValue(e.target.value)}
                    onBlur={handleTextEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTextEdit();
                    }}
                  />
                </foreignObject>
              ) : (
                <KonvaText
                  key={t.id}
                  id={t.id}
                  text={t.text}
                  x={t.x}
                  y={t.y}
                  fill={t.fill}
                  fontSize={20}
                  draggable
                  onClick={
                    tool === "eraser"
                      ? () => handleObjectEraser(t.id, "text")
                      : () => setSelectedId(t.id)
                  }
                  onTap={
                    tool === "eraser"
                      ? () => handleObjectEraser(t.id, "text")
                      : () => setSelectedId(t.id)
                  }
                  onDblClick={() => handleTextDblClick(t)}
                  onDragEnd={(e) => {
                    pushToUndo();
                    setTexts((texts) =>
                      texts.map((text) =>
                        text.id === t.id
                          ? {
                              ...text,
                              x: snap(e.target.x()),
                              y: snap(e.target.y()),
                            }
                          : text
                      )
                    );
                  }}
                />
              )
            )}
            {images.map((img) => (
              <UploadedImage
                key={img.id}
                shapeProps={img}
                isSelected={selectedId === img.id}
                onSelect={() => setSelectedId(img.id)}
                onChange={(newAttrs) => {
                  pushToUndo();
                  setImages((images) =>
                    images.map((image) =>
                      image.id === img.id ? { ...image, ...newAttrs } : image
                    )
                  );
                }}
              />
            ))}
            {selectedId &&
              (() => {
                const selectedNode = stageRef.current.findOne(`#${selectedId}`);
                if (selectedNode) {
                  return (
                    <Transformer
                      ref={transformerRef}
                      nodes={[selectedNode]}
                      flipEnabled={false}
                    />
                  );
                } else {
                  return null;
                }
              })()}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
