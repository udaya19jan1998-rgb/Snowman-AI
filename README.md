# ⛄️ Snowman AI (Offline Local Assistant)

Snowman AI is a fully offline local assistant that runs entirely on your machine using:

- Ollama for chat + vision (Qwen3-VL)
- Ollama image model (default: FLUX.2 Klein 4B) for text-to-image generation
- A single smart endpoint (/api/agent) that routes requests to:
  - `chat`
  - `vision` (image → text)
  - `txt2img` (text → image)
  - `img_edit` (image editing via a “re-render” prompt bridge)

This repository contains:

- client/ → React UI
- server/ → Express API (Ollama bridge, image generation, stop/cancel logic)

**No cloud AI APIs. No external keys. Fully local model inference.**

> [!NOTE]
> Core chat, vision, and image generation run offline after the initial dependency and model downloads. Optional browser voice transcription may use an online service, depending on the browser. See [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

---

## ✨ What’s New in v4.12

This update focuses on **lower memory pressure, fewer unnecessary model calls, and support for more file types**, while keeping Snowman’s local chat, vision, image generation, and editing workflow.

| Update | What changed | Why it matters |
| --- | --- | --- |
| ⚡ Direct request paths | Normal text chat and explicit image actions can skip the JSON router. | Avoids an extra model inference when the action is already known. |
| 🖼 Faster single-image answers | A single-image vision request returns the vision answer directly. | Avoids the extra synthesis call used when combining multiple images. |
| 🧠 Model memory management | Snowman requests unloading of the image model before chat/vision, and chat/vision models before image generation. | Reduces the need to keep both large model families resident together. |
| 🧊 Low-memory startup | The included script limits Ollama to one loaded model and one parallel request, and requests Flash Attention with a quantized KV cache. | Reduces memory pressure on supported configurations. |
| 🎨 Lighter image defaults | Default generation uses **448 × 448** images and **3 steps**. | Prioritizes quicker previews and a smaller image workload; quality depends on the model and settings. |
| 📄 Document understanding | Upload PDF, DOCX, and supported text/code files. | Ask questions about local documents without a cloud document service. |
| 🧩 Mixed uploads | Combine documents and images in one question. | Snowman combines document excerpts with descriptions of the attached images. |
| 📏 Bounded document context | Long files are reduced to selected excerpts, with a partial-coverage notice. | Keeps document input within a manageable context budget. |
| 🔧 Clearer backend structure | Document handling and image arguments live in dedicated modules. | Makes the backend easier to maintain and extend. |
| ⏱ Optional timing logs | Enable `SNOWMAN_LOG_TIMINGS=1`. | Inspect model load time, total inference time, token count, and tokens per second. |

### 🐛 Bug Fixes & Reliability Updates

- **Mixed uploads:** images and documents in the same message are now handled together, combining extracted document text with image descriptions for a shared answer.
- **File validation:** unsupported files, unreadable documents, and incompatible file/action combinations return clearer errors instead of being sent through the wrong processing path.
- **Long-document coverage:** responses flag when only selected excerpts were processed, so a partial review is not presented as a full-document review.
- **Image-generation arguments:** image dimensions and step counts are validated before starting Ollama, and prompt text is separated from command-line options.
- **Response-limit diagnostics:** the server logs a warning when Ollama reports that an answer reached its output limit, making incomplete responses easier to diagnose.

> [!NOTE]
> **Microphone fix from the latest follow-up patch:** stop speech recognition and clear the active transcript when sending a message, whether through Enter or the Send button. Apply that patch to `client/src/App.js` before publishing this release—the uploaded source archive reviewed for this README still contains the earlier `send()` implementation.

**Performance depends on your hardware, model loading, and workload.** These changes reduce specific sources of overhead; no measured speedup or RAM-saving percentage is claimed. Switching between model families can still incur a reload delay.

---

## ✅ Features

### 💬 Chat UI

- Clean modern chat bubbles
- Code blocks rendered with Copy button
- Copy button for normal messages too
- Minimal inline markdown rendering:
  - **Bold** and *italic* text
  - Formatting asterisks do not appear visually

---

### 🖼 Images

- Upload multiple images
- Drag & drop images
- Footer-only “Drop image(s)” overlay
- Preview bar with removable thumbnails

---

### 📄 Documents & Mixed Uploads

- Upload **PDF, DOCX, plain text, Markdown, CSV, JSON, logs, and supported source-code files**.
- Combine documents and images in the same message.
- Ask for summaries, explanations, or comparisons across attachments.
- Receive a notice when only selected document excerpts were supplied to the model.
- Upload up to **5 files per request**, with a **10 MB limit per file**.

Document support extracts text; it does not preserve document layout or execute uploaded code. Convert legacy `.doc` files to `.docx`. Scanned PDFs need OCR; uploading a page as an image is an alternative. Extracted text above 500,000 characters per document must be split, and document questions are limited to 1,000 characters.

---

### 🎨 Generated Image Gallery

- Supports multiple generated images
- Click to preview full size
- Download button for each image
- Images saved locally in server/public

---

### 🎙 Voice to Text

- Uses browser SpeechRecognition
- Mic button toggles live transcription
- Injects speech directly into the textbox

---

### 🛑 Real STOP System

- Cancels the in-flight HTTP request (AbortController)
- Calls /api/stop to kill server-side generation processes
- Uses detached process groups to kill entire spawn trees
- Prevents late-response UI corruption (nonce-based invalidation)

---

### 🧠 Intelligent Routing (Single Endpoint Design)

All user input goes through:

```http
POST /api/agent
```

The updated backend combines **direct routes** with a **Qwen3-VL JSON router**:

- Normal text chat can go straight to the chat model.
- The frontend recognizes common image-generation prompts and sends an explicit action.
- Explicit vision, generation, and editing actions bypass model-based routing.
- Document and mixed-file requests use dedicated processing branches.
- Requests that still need automatic routing use Qwen3-VL to select an action.

Example router response:

```json
{
  "action": "vision"
}
```

The router chooses `chat`, `vision`, `txt2img`, or `img_edit`. Document-processing branches return `document` or `mixed` responses through the same endpoint. When the router supplies a final chat reply, the backend reuses it instead of asking the model to answer again.

**One endpoint, with faster direct paths for known actions and model-based routing when needed.**

---

## 🧱 Tech Stack

#### Frontend

- React (Create React App)
- axios
- react-icons
- react-speech-recognition

#### Backend

- Node.js
- Express
- multer (file uploads)
- pdf-parse (PDF text extraction)
- mammoth (DOCX text extraction)
- spawn() to run Ollama image models
- True process-tree kill (macOS/Linux compatible)

#### Models (Default)

| Type | Default model |
| --- | --- |
| 💬 Chat | `qwen3-vl:8b-instruct-q4_K_M` |
| 🖼 Vision | `qwen3-vl:8b-instruct-q4_K_M` |
| 🎨 Image | `x/flux2-klein:4b` |

**Models can be swapped via .env without touching code.**

---

## 📁 Project Structure

```txt
snowman v4.12 github/
│
├── client/                     # React frontend
│
├── server/
│   ├── public/                 # Generated images saved locally
│   ├── uploads/                # Temporary uploads (gitignored)
│   ├── .env.example
│   ├── documents.js            # File types, text extraction, excerpt selection
│   ├── image-options.js        # Validated Ollama image-generation arguments
│   ├── index.js                # API routes, model orchestration, cancellation
│   ├── package-lock.json
│   └── package.json
│
├── .gitignore
├── package-lock.json
├── package.json
├── start-ollama-low-memory.sh   # Ollama memory and concurrency settings
└── README.md
```

The `client/` folder is collapsed here, matching the project overview. Keep its `package.json` and `package-lock.json` committed alongside the frontend source. Save this README as `README.md` in the project root.

---

## ⚙️ Installation & Setup

---

### 1️⃣ Install Node.js

Requires Node 18+.

Check:
```bash
node -v
npm -v
```

---

### 2️⃣ Install Ollama

> [!IMPORTANT]
> **For Snowman’s image generation, use Ollama 0.32.5 on supported macOS hardware.** Ollama temporarily removed experimental image generation in **0.32.6** and explicitly directs image-generation users to remain on **0.32.5**. See the [official 0.32.6 release notes](https://github.com/ollama/ollama/releases/tag/v0.32.6).
>
> Download the pinned version from the **[official Ollama 0.32.5 release page](https://github.com/ollama/ollama/releases/tag/v0.32.5)**. Do not assume that installing a newer release preserves image-generation support; check its release notes before upgrading.

| Platform | Official download | Image-generation note |
| --- | --- | --- |
| 🍎 macOS | [Ollama for macOS](https://ollama.com/download/mac) | For image generation, select **0.32.5** from the versioned release page above. |
| 🪟 Windows | [Ollama for Windows](https://ollama.com/download/windows) | Available for chat and vision; this does not enable the macOS-only image-generation feature. |

Ollama’s [official image-generation documentation](https://ollama.com/blog/image-generation) describes the experimental feature as macOS-only. The general download pages may provide a newer version than 0.32.5.

*Version guidance verified September 20, 2026.*

Verify:
```bash
ollama -v
```

Start Ollama:
```bash
ollama serve
```

---

### 3️⃣ Pull Required Models

```bash
ollama pull qwen3-vl:8b-instruct-q4_K_M
ollama pull x/flux2-klein:4b
```

Verify:
```bash
ollama list
```

---

### 4️⃣ Setup Server

Open a terminal at the project root, then run:

```bash
cd server
npm ci
```

> [!NOTE]
> **Use `npm ci` in both `server/` and `client/` for a clean installation from their lockfiles.** Each folder needs a committed `package-lock.json` that matches its `package.json`. You do not need to run `npm install` first when those lockfiles are already present and in sync.
>
> If a lockfile is missing, use `npm install` in that folder to generate it and commit it. If the files disagree, reconcile the intended dependencies and update the lockfile before retrying `npm ci`. See the [official npm documentation](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

Create:

***server/.env***

Example:
```dotenv
PORT=5000

OLLAMA_URL=http://localhost:11434
OLLAMA_CHAT_MODEL=qwen3-vl:8b-instruct-q4_K_M
OLLAMA_VISION_MODEL=qwen3-vl:8b-instruct-q4_K_M

OLLAMA_IMAGE_MODEL=x/flux2-klein:4b

# Chat and vision limits
OLLAMA_NUM_CTX=8192
OLLAMA_NUM_PREDICT=4096
OLLAMA_KEEP_ALIVE=5m

# Image generation: lightweight defaults
IMAGE_WIDTH=448
IMAGE_HEIGHT=448
IMAGE_STEPS=3
IMAGE_GEN_TIMEOUT_MS=600000

# Optional inference timing logs (0 = off, 1 = on)
SNOWMAN_LOG_TIMINGS=0
```

Start server:
```bash
node index.js
```

---

### 5️⃣ Setup Client

Keep the server running. Open a **second terminal at the project root**, then run:

```bash
cd client
npm ci
```
Create:

***client/.env***

Example:
```dotenv
REACT_APP_API=http://localhost:5000
```

Start client:
```bash
npm start
```

#### Open:

**[http://localhost:3000](http://localhost:3000)**

---

### 📦 Root Package (If Used)

The project also includes a root `package.json` and `package-lock.json`. If you use scripts that depend on packages declared there, run the following **from the project root** as well:

```bash
npm ci
```

The separate client/server setup above installs their dependencies directly. Whether the root scripts also install or manage those packages depends on the root `package.json` configuration.

---

### 🧊 Optional: Low-Memory Ollama Startup

To use the included startup helper, run this from the project root in a compatible shell:

```bash
bash start-ollama-low-memory.sh
```

Use this instead of a separate `ollama serve` process. Stop an existing Ollama service before starting the helper so its configuration takes effect.

---

## 🖼 How Image Editing Works (Prompt-Bridge)

Snowman AI uses a re-render method instead of latent img2img.

**Pipeline:**

1. The vision model describes the original image precisely.
2. Qwen combines the **image description** and **user edit request** into one explicit generation prompt.
3. FLUX.2 Klein regenerates the edited image.

This allows editing even when the image model only supports txt2img.

**Fully offline after setup.** The result is a newly generated interpretation; exact visual preservation is not guaranteed.

---

## 💻 Performance Notes (16GB RAM Systems)

**Qwen3-VL 8B + FLUX.2 Klein 4B is still a substantial workload.** The updated version manages when models are loaded and how much work each request asks them to do.

### 🧊 How It Uses Less RAM

The low-memory startup script applies:

```sh
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=1
OLLAMA_FLASH_ATTENTION=1
OLLAMA_KV_CACHE_TYPE=q8_0
```

- **One parallel request:** limits simultaneous inference workloads.
- **One loaded model:** reduces overlap between large resident models.
- **Flash Attention and a q8_0 KV cache:** request a more memory-efficient attention/cache configuration where the model and Ollama backend support it.
- **Explicit unloading:** Snowman checks loaded models and requests `keep_alive: 0` for the other model family before switching tasks. Unloading is best-effort; the low-memory service configuration provides an additional limit.
- **Bounded context:** chat/vision defaults to an 8,192-token context. Document requests use selected excerpts and a smaller output allowance instead of sending entire long files.

These settings take effect when Ollama is started through the helper. They are not activated simply by keeping the script in the repository.

### ⚡ How It Reduces Waiting

- Direct actions skip a separate routing inference.
- Router-generated chat replies are reused.
- Single-image vision returns its answer without a second synthesis pass.
- `OLLAMA_KEEP_ALIVE=5m` lets repeated chat/vision requests reuse a loaded model, unless another action unloads it.
- **448 × 448 / 3-step** image defaults favor quicker generation; image batches run sequentially to avoid parallel generation peaks.
- Long documents contribute bounded excerpts rather than their complete contents.

**Tradeoff:** limiting resident models saves memory, but switching between chat and image generation can take longer because weights must reload. Lower image resolution and fewer steps can reduce detail. Mixed-file questions still require image-description calls followed by a combined answer.

### 🎛 Tuning for Your Machine

For smaller images, update `server/.env`:

```dotenv
IMAGE_WIDTH=384
IMAGE_HEIGHT=384
IMAGE_STEPS=3
```

Image dimensions must be multiples of 16 between 64 and 2048. Restart the server after changing its `.env` settings.

Generate one image at a time when memory is tight. You can also reduce `OLLAMA_NUM_CTX` or `OLLAMA_NUM_PREDICT`, but shorter limits reduce input capacity or may truncate answers. Keep enough context space for both input and output.

### ⏱ Measure Your Own Results

Enable timing output in `server/.env`, then restart the server:

```dotenv
SNOWMAN_LOG_TIMINGS=1
```

Compare the same prompt, model, and image settings on the same machine. Record first-request performance separately from repeated requests because model loading can dominate the first run. Use your operating system’s memory monitor to observe RAM use; Snowman’s timing logs do not measure peak RAM.

---

## 🔄 Swapping Models

No code changes required.

#### Just update .env:
```
OLLAMA_CHAT_MODEL=your_model
OLLAMA_IMAGE_MODEL=your_image_model
```

**Restart server.**

---

## 🧠 Why I Built Snowman AI

I built Snowman AI to explore a question that kept bothering me:

## _Can powerful AI exist without depending on the cloud?_

Most AI systems today are centralized. They require internet access, API keys, remote servers, and external data routing. That model works — but it introduces privacy risks, latency issues, and infrastructure dependence.

I wanted to design an assistant that:

- Runs entirely offline
- Maintains full user privacy
- Requires no API keys
- Demonstrates true local orchestration
- Integrates text, vision, and image generation in one unified architecture
- Handles real process cancellation safely at the system level

Snowman AI is not just about using models — it’s about building the system that coordinates them intelligently.

The most important part of this project is the routing architecture:

I started with a model-based JSON router that decides whether a request is chat, vision, generation, or editing. The updated version adds direct paths for known actions and dedicated document handling, keeping flexible routing while avoiding unnecessary model calls.

That architectural decision changed the entire system.

**It made the assistant extensible.**

**It made it scalable.**

**It made it modular.**

**And it made it feel closer to how real intelligent systems should be built.**

---

## 🌍 Real-World Impact & Applications

Snowman AI demonstrates how AI systems can operate independently of centralized infrastructure.

These are potential applications of the local architecture:

---

### 🏫 1. Schools & Educational Institutions

- Schools can deploy AI assistants without exposing student data to external servers
- No dependency on expensive cloud subscriptions
- Can run in computer labs with limited connectivity
- Useful for:
  - Homework help
  - Local research assistance
  - Image-based science analysis
  - Offline tutoring systems

Privacy is especially critical in educational environments.

---

### 🌐 2. Remote or Low-Connectivity Regions

In rural or remote areas:

- Internet may be slow or unreliable
- Cloud services may be inaccessible
- Data privacy may be sensitive

A fully local AI system allows:

- Medical image explanation research (offline; not a validated diagnostic tool)
- Agricultural advisory support
- Educational tools
- Local language experimentation

**Core model inference stays on the local machine.**

---

### 🔒 3. Privacy-Sensitive Environments

Organizations that require strict data control:

- Legal offices
- Healthcare settings
- Research labs
- Defense or internal corporate environments

Snowman AI shows how multimodal AI systems can be deployed without exposing:

- Internal documents
- Medical images
- Proprietary information

**Core AI processing stays local.** Optional browser voice transcription follows the browser’s own privacy behavior.

---

### 🖥 4. Personal Sovereignty Over AI

The long-term vision is AI systems that users control — not platforms that control users.

Snowman AI is a small step toward:

- Model modularity
- Local autonomy
- Transparent orchestration
- User-owned intelligence infrastructure

---

## 🧩 What This Project Really Demonstrates

Beyond the UI and models, Snowman AI demonstrates:

- System-level thinking
- Process management (true process-tree termination)
- JSON-based intent routing via LLM
- Prompt-bridging for pseudo img2img
- Full-stack architecture design
- Real-world performance tradeoffs (RAM limits, model swapping, resolution tuning)

It reflects my interest in building systems — not just calling APIs.

---

## 🚀 Future Improvements

*Planned ideas—not features already implemented in this release.*

### ⚡ Performance & Memory

- **Streaming token responses** so answers appear as they are generated.
- **Selectable performance presets** for low-memory, balanced, and higher-quality use.
- **Model switching controls** that let users choose between lower RAM use and keeping models warm.
- **A RAM/GPU usage dashboard** with model-load and generation timings.
- **Reproducible benchmarks** comparing cold starts, repeated prompts, and peak memory across supported machines.

### 📄 Documents & Knowledge

- **Local OCR** for scanned PDFs and image-only documents.
- **Better document retrieval** using local embeddings, with page-aware citations.
- **Reusable document indexes** to avoid extracting and processing the same files repeatedly.
- **Persistent conversation memory** with local storage, export, and deletion controls.

### 🎨 Images & Multimodal Tools

- **True img2img and inpainting** for more precise edits than prompt-based re-rendering.
- **Image quality controls** for resolution, steps, and supported generation options.
- **Multi-model switching from the UI**, including capability checks before selecting a model.

### 🛠 Reliability & User Experience

- **A generation queue** with progress, per-job cancellation, and resource-aware scheduling.
- **End-to-end cancellation for every processing stage**, including document extraction and model HTTP requests.
- **Offline speech-to-text** to remove the browser transcription service dependency.
- **Startup checks** for Ollama version, installed models, and platform capabilities.
- **Automatic cleanup controls** for temporary uploads and generated files.

---

## 👤 Author

**Udaya Chandra Sutar**

Creator of Snowman AI

---

