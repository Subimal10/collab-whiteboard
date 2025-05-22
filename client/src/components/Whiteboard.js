// src/components/Whiteboard.js
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Circle,
  Arrow,
  Transformer,
  Image as KonvaImage,
  Text as KonvaText,
} from "react-konva";
import useImage from "use-image";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles/Whiteboard.css";

// global socket
const socket = io("http://localhost:5000");

// helper component for uploaded images
const UploadedImage = ({ shapeProps, isSelected, onSelect, onChange }) => {
  const [img] = useImage(shapeProps.src);
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
        image={img}
        ref={shapeRef}
        {...shapeProps}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) =>
          onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() })
        }
        onTransformEnd={() => {
          const node = shapeRef.current;
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * node.scaleX()),
            height: Math.max(5, node.height() * node.scaleY()),
            scaleX: node.scaleX(),
            scaleY: node.scaleY(),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && <Transformer ref={trRef} flipEnabled={false} />}
    </>
  );
};

// keep stage 16:9 between 600×350 and 1200×700
// in Whiteboard.js, replace getStageSize() with:
function getStageSize() {
  const maxW = Math.min(window.innerWidth - 40, 1200);
  const minW = 600;
  let width = Math.max(minW, maxW);
  // ideal height for 16∶9
  let height = Math.round(width / (16 / 9));

  // then cap by available viewport (e.g. 80% of window)
  const maxH = window.innerHeight * 0.8;
  if (height > maxH) {
    height = Math.round(maxH);
    width = Math.round(height * (16 / 9));
  }

  return { width, height };
}

export default function Whiteboard() {
  const { roomId } = useParams();
  const stageRef = useRef();
  const transformerRef = useRef();

  const [stageSize, setStageSize] = useState(getStageSize());
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#22223b");
  const [fillColor, setFillColor] = useState("#ffffff00");
  const [lineWidth, setLineWidth] = useState(4);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  const [lines, setLines] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [texts, setTexts] = useState([]);
  const [images, setImages] = useState([]);

  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editingTextId, setEditingTextId] = useState(null);
  const [textEditValue, setTextEditValue] = useState("");
  const [addingText, setAddingText] = useState(false);

  // responsive resize
  // near top of component, before any useEffects:
  const prevSize = useRef(stageSize);

  // replace your resize effect with this:
  useEffect(
    () => {
      const onResize = () => {
        const newSize = getStageSize();
        const old = prevSize.current;
        const scaleX = newSize.width / old.width;
        const scaleY = newSize.height / old.height;

        // 1) rescale lines
        setLines((all) =>
          all.map((l) => ({
            ...l,
            points: l.points.map((p, i) =>
              i % 2 === 0 ? p * scaleX : p * scaleY
            ),
          }))
        );

        // 2) rescale shapes
        setShapes((all) =>
          all.map((s) => {
            const upd = {
              ...s,
              x: s.x * scaleX,
              y: s.y * scaleY,
              x2: s.x2 * scaleX,
              y2: s.y2 * scaleY,
              strokeWidth: s.strokeWidth * ((scaleX + scaleY) / 2),
            };
            if (upd.width) upd.width *= scaleX;
            if (upd.height) upd.height *= scaleY;
            if (upd.radius) upd.radius *= scaleX; // approximate
            return upd;
          })
        );

        // 3) rescale texts
        setTexts((all) =>
          all.map((t) => ({
            ...t,
            x: t.x * scaleX,
            y: t.y * scaleY,
            fontSize: (t.fontSize || 20) * scaleX,
          }))
        );

        // 4) rescale images
        setImages((all) =>
          all.map((i) => ({
            ...i,
            x: i.x * scaleX,
            y: i.y * scaleY,
            width: i.width * scaleX,
            height: i.height * scaleY,
          }))
        );

        prevSize.current = newSize;
        setStageSize(newSize);
      };

      window.addEventListener("resize", onResize);
      onResize();
      return () => window.removeEventListener("resize", onResize);
    },
    [
      /* no deps: everything read from refs or setters */
    ]
  );

  // join room & load saved board
  useEffect(() => {
    socket.emit("join-room", roomId);
    axios
      .get(`/api/whiteboard/${roomId}`)
      .then((res) => {
        if (res.data.data) {
          const { lines, shapes, texts, images } = res.data.data;
          setLines(lines || []);
          setShapes(shapes || []);
          setTexts(texts || []);
          setImages(images || []);
        }
      })
      .catch(console.error);
  }, [roomId]);

  // undo/redo helpers
  const pushToUndo = useCallback(() => {
    setUndoStack((u) => [
      ...u,
      {
        lines: [...lines],
        shapes: [...shapes],
        texts: [...texts],
        images: [...images],
      },
    ]);
    setRedoStack([]);
  }, [lines, shapes, texts, images]);

  const applyHistory = (h) => {
    if (!h) return;
    setLines(h.lines);
    setShapes(h.shapes);
    setTexts(h.texts);
    setImages(h.images);
  };

  const handleUndo = () => {
    if (!undoStack.length) return;
    const prev = undoStack.at(-1);
    setRedoStack((r) => [...r, { lines, shapes, texts, images }]);
    applyHistory(prev);
    socket.emit("sync-state", {
      roomId,
      lines: prev.lines,
      shapes: prev.shapes,
      texts: prev.texts,
      images: prev.images,
    });
    setUndoStack((u) => u.slice(0, -1));
    setSelectedId(null);
  };

  const handleRedo = () => {
    if (!redoStack.length) return;
    const next = redoStack.at(-1);
    setUndoStack((u) => [...u, { lines, shapes, texts, images }]);
    applyHistory(next);
    socket.emit("sync-state", {
      roomId,
      lines: next.lines,
      shapes: next.shapes,
      texts: next.texts,
      images: next.images,
    });
    setRedoStack((r) => r.slice(0, -1));
    setSelectedId(null);
  };

  // snap util
  const snap = (v) => (snapToGrid ? Math.round(v / 20) * 20 : v);

  // drawing handlers
  const handleMouseDown = (e) => {
    const pos = stageRef.current.getPointerPosition();
    pushToUndo();

    if (tool === "pen" || tool === "eraser") {
      const newLine = {
        tool,
        points: [pos.x, pos.y],
        color: tool === "eraser" ? "#fff" : color,
        width: lineWidth,
        id: "line" + Date.now(),
      };
      setLines((a) => [...a, newLine]);
      socket.emit("drawing", { roomId, line: newLine });
    } else if (["rect", "circle", "arrow"].includes(tool)) {
      const id = tool + Date.now();
      const base = {
        id,
        type: tool,
        x: pos.x,
        y: pos.y,
        stroke: color,
        fill: tool === "arrow" ? color : fillColor,
        strokeWidth: lineWidth,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      };
      const newShape =
        tool === "arrow"
          ? { ...base, x2: pos.x + 1, y2: pos.y + 1 }
          : { ...base, x2: pos.x, y2: pos.y };
      setShapes((a) => [...a, newShape]);
      socket.emit("drawing", { roomId, shape: newShape });
      setSelectedId(id);
    } else if (tool === "text" && !addingText) {
      const id = "text" + Date.now();
      const newText = { id, text: "", x: pos.x, y: pos.y, fill: color };
      setTexts((a) => [...a, newText]);
      socket.emit("drawing", { roomId, text: newText });
      setSelectedId(id);
      setEditingTextId(id);
      setTextEditValue("");
      setAddingText(true);
    }

    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const pos = stageRef.current.getPointerPosition();

    // pen/eraser: append a point *and* broadcast it
    if (tool === "pen" || tool === "eraser") {
      setLines((all) => {
        const last = all[all.length - 1];
        const updatedLine = {
          ...last,
          points: [...last.points, pos.x, pos.y],
        };
        const rest = all.slice(0, -1);
        const next = [...rest, updatedLine];
        // send the *updated* stroke to the room
        socket.emit("drawing", { roomId, line: updatedLine });
        return next;
      });
    }

    // rectangle/circle/arrow: same idea, broadcast your x2/y2 updates
    else if (["rect", "circle", "arrow"].includes(tool)) {
      setShapes((all) => {
        const last = all[all.length - 1];
        const updatedShape = { ...last, x2: pos.x, y2: pos.y };
        const rest = all.slice(0, -1);
        const next = [...rest, updatedShape];
        socket.emit("drawing", { roomId, shape: updatedShape });
        return next;
      });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    if (["rect", "circle", "arrow"].includes(tool)) setTool("select");
    if (tool === "text") {
      setAddingText(false);
      setTool("select");
    }
  };

  // text edit handlers
  const handleTextDblClick = (t) => {
    setEditingTextId(t.id);
    setTextEditValue(t.text);
  };
  const handleTextEdit = () => {
    // grab the original node so we preserve x/y/fill
    const original = texts.find((t) => t.id === editingTextId) || {};
    const updated = {
      ...original,
      id: editingTextId,
      text: textEditValue,
    };

    // update local state
    setTexts((all) => all.map((t) => (t.id === editingTextId ? updated : t)));

    // broadcast to others
    socket.emit("drawing", { roomId, text: updated });

    // exit edit mode
    setEditingTextId(null);
    setTextEditValue("");
    setTool("select"); // switch back to select
  };

  // image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = "img" + Date.now();
      const newImage = {
        id,
        src: reader.result,
        x: 100,
        y: 100,
        width: 150,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      };
      setImages((a) => [...a, newImage]);
      socket.emit("drawing", { roomId, image: newImage });
      setSelectedId(id);
      setTool("select");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // download/export
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
    }, 100);
  };

  // clear
  const handleClear = () => {
    pushToUndo();
    setLines([]);
    setShapes([]);
    setTexts([]);
    setImages([]);
    socket.emit("clear-canvas", roomId);
    setSelectedId(null);
  };

  // ── REMOTE SYNC (upsert) ───────────────────────────────────────
  useEffect(() => {
    const handler = (data) => {
      // LINE
      if (data.line) {
        setLines((all) => {
          const exists = all.some((l) => l.id === data.line.id);
          if (exists) {
            return all.map((l) => (l.id === data.line.id ? data.line : l));
          } else {
            return [...all, data.line];
          }
        });
      }

      // SHAPE
      if (data.shape) {
        setShapes((all) => {
          const exists = all.some((s) => s.id === data.shape.id);
          if (exists) {
            return all.map((s) => (s.id === data.shape.id ? data.shape : s));
          } else {
            return [...all, data.shape];
          }
        });
      }

      // TEXT
      if (data.text) {
        setTexts((all) => {
          const exists = all.some((t) => t.id === data.text.id);
          if (exists) {
            return all.map((t) => (t.id === data.text.id ? data.text : t));
          } else {
            return [...all, data.text];
          }
        });
      }

      // IMAGE
      if (data.image) {
        setImages((all) => {
          const exists = all.some((i) => i.id === data.image.id);
          if (exists) {
            return all.map((i) => (i.id === data.image.id ? data.image : i));
          } else {
            return [...all, data.image];
          }
        });
      }
    };

    socket.on("drawing", handler);
    socket.on("clear-canvas", () => {
      setLines([]);
      setShapes([]);
      setTexts([]);
      setImages([]);
    });

    // ← NEW: listen for full‐canvas sync
    socket.on("sync-state", ({ lines, shapes, texts, images }) => {
      setLines(lines);
      setShapes(shapes);
      setTexts(texts);
      setImages(images);
    });

    return () => {
      socket.off("drawing", handler);
      socket.off("clear-canvas");
      socket.off("sync-state");
    };
  }, []); // <— no dependencies here

  // autosave
  useEffect(() => {
    const iv = setInterval(() => {
      axios
        .post(`/api/whiteboard/${roomId}`, { lines, shapes, texts, images })
        .catch(console.error);
    }, 5000);
    return () => clearInterval(iv);
  }, [roomId, lines, shapes, texts, images]);

  // delete-key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Delete" && selectedId) {
        pushToUndo();
        setLines((a) => a.filter((l) => l.id !== selectedId));
        setShapes((a) => a.filter((s) => s.id !== selectedId));
        setTexts((a) => a.filter((t) => t.id !== selectedId));
        setImages((a) => a.filter((i) => i.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, pushToUndo]);

  // transformer for selected
  useEffect(() => {
    if (transformerRef.current && selectedId) {
      const node = stageRef.current.findOne(`#${selectedId}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId, lines, shapes, texts, images]);

  // grid-lines
  const gridLines = [];
  if (showGrid) {
    for (let i = 0; i < stageSize.width / 20; i++) {
      gridLines.push(
        <Rect
          key={`v${i}`}
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
          key={`h${j}`}
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
    <div className="whiteboard-container">
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
        <button onClick={handleUndo} disabled={!undoStack.length}>
          Undo
        </button>
        <button onClick={handleRedo} disabled={!redoStack.length}>
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

      {/* in-place text editor */}
      {editingTextId && (
        <input
          className="text-editor"
          style={{
            position: "absolute",
            left: texts.find((t) => t.id === editingTextId).x,
            top: texts.find((t) => t.id === editingTextId).y,
          }}
          value={textEditValue}
          onChange={(e) => setTextEditValue(e.target.value)}
          onBlur={handleTextEdit}
          onKeyDown={(e) => e.key === "Enter" && handleTextEdit()}
        />
      )}

      <div className="stage-container">
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            // match the exact pixel dims
            width: stageSize.width,
            height: stageSize.height,

            // visual styling
            background: "#fff",
            border: "2px solid #007bff",
            borderRadius: 8,

            // avoid Konva forcing inline-block whitespace
            display: "block",
            boxSizing: "border-box",
          }}
        >
          <Layer>
            {gridLines}

            {lines.map((l) => (
              <Line
                key={l.id}
                points={l.points}
                stroke={l.color}
                strokeWidth={l.width}
                tension={0.5}
                lineCap="round"
                globalCompositeOperation={
                  l.tool === "eraser" ? "destination-out" : "source-over"
                }
              />
            ))}

            {shapes.map((s) => {
              const props = {
                key: s.id,
                id: s.id,
                x: snap(s.x),
                y: snap(s.y),
                stroke: s.stroke,
                fill: s.fill,
                strokeWidth: s.strokeWidth,
                draggable: true,

                // select on click
                onClick: () => setSelectedId(s.id),
                onTap: () => setSelectedId(s.id),

                // 2a) onDragEnd: update state + broadcast
                onDragEnd: (e) => {
                  pushToUndo();
                  const updated = {
                    ...s,
                    x: snap(e.target.x()),
                    y: snap(e.target.y()),
                  };
                  setShapes((all) =>
                    all.map((sh) => (sh.id === s.id ? updated : sh))
                  );
                  socket.emit("drawing", { roomId, shape: updated });
                },

                // 2b) onTransformEnd: update state + broadcast
                onTransformEnd: () => {
                  pushToUndo();
                  const node = stageRef.current.findOne(`#${s.id}`);
                  const update = {
                    x: snap(node.x()),
                    y: snap(node.y()),
                    // reset scales after reading width/height/radius
                    scaleX: 1,
                    scaleY: 1,
                  };
                  if (s.type === "rect") {
                    update.width = Math.max(5, node.width() * node.scaleX());
                    update.height = Math.max(5, node.height() * node.scaleY());
                  }
                  if (s.type === "circle") {
                    update.radius = Math.max(5, node.radius() * node.scaleX());
                  }
                  const updated = { ...s, ...update };
                  setShapes((all) =>
                    all.map((sh) => (sh.id === s.id ? updated : sh))
                  );
                  setSelectedId(s.id);
                  socket.emit("drawing", { roomId, shape: updated });
                },
              };

              if (s.type === "rect")
                return (
                  <Rect
                    {...props}
                    width={Math.abs(s.x2 - s.x)}
                    height={Math.abs(s.y2 - s.y)}
                  />
                );
              if (s.type === "circle")
                return (
                  <Circle
                    {...props}
                    radius={Math.hypot(s.x2 - s.x, s.y2 - s.y) / 2}
                  />
                );
              if (s.type === "arrow")
                return (
                  <Arrow
                    {...props}
                    points={[s.x, s.y, s.x2, s.y2]}
                    pointerLength={15}
                    pointerWidth={15}
                  />
                );
              return null;
            })}

            {texts.map((t) =>
              editingTextId === t.id ? (
                <foreignObject
                  key={t.id}
                  x={t.x}
                  y={t.y}
                  width={200}
                  height={50}
                >
                  <input
                    style={{
                      fontSize: 20,
                      width: 180,
                      padding: 4,
                      borderRadius: 4,
                      border: "1px solid #007bff",
                    }}
                    value={textEditValue}
                    autoFocus
                    onChange={(e) => setTextEditValue(e.target.value)}
                    onBlur={handleTextEdit}
                    onKeyDown={(e) => e.key === "Enter" && handleTextEdit()}
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
                  fontSize={t.fontSize || 20}
                  draggable
                  onClick={() => setSelectedId(t.id)}
                  onTap={() => setSelectedId(t.id)}
                  onDblClick={() => handleTextDblClick(t)}
                  onDragEnd={(e) => {
                    pushToUndo();
                    const updated = {
                      ...t,
                      x: snap(e.target.x()),
                      y: snap(e.target.y()),
                    };
                    setTexts((all) =>
                      all.map((tx) => (tx.id === t.id ? updated : tx))
                    );
                    socket.emit("drawing", { roomId, text: updated });
                  }}
                  onTransformEnd={() => {
                    pushToUndo();
                    const node = stageRef.current.findOne(`#${t.id}`);
                    // scaleX and scaleY applied to fontSize
                    const newFontSize = Math.max(
                      5,
                      node.fontSize() * node.scaleX()
                    );
                    const updated = {
                      ...t,
                      x: snap(node.x()),
                      y: snap(node.y()),
                      fontSize: newFontSize,
                    };
                    // reset scale so next transform is fresh
                    node.scaleX(1);
                    node.scaleY(1);
                    setTexts((all) =>
                      all.map((tx) => (tx.id === t.id ? updated : tx))
                    );
                    socket.emit("drawing", { roomId, text: updated });
                    setSelectedId(t.id);
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
                  setImages((all) =>
                    all.map((im) => (im.id === img.id ? newAttrs : im))
                  );
                  socket.emit("drawing", { roomId, image: newAttrs });
                }}
              />
            ))}

            {selectedId && (
              <Transformer
                ref={transformerRef}
                rotateEnabled={true}
                keepRatio={true}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
