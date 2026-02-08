"""
小微企业财务记账系统 - 服务启动管理器
tkinter GUI for managing backend/frontend services.
"""

import os
import sys
import signal
import subprocess
import threading
import webbrowser
import tkinter as tk
from tkinter import scrolledtext

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)

# Colors
COLOR_BG = "#F5F7FA"
COLOR_BRAND = "#1B65B9"
COLOR_GREEN = "#52C41A"
COLOR_GRAY = "#BFBFBF"
COLOR_RED = "#FF4D4F"
COLOR_WHITE = "#FFFFFF"
COLOR_TEXT = "#333333"
COLOR_SECTION_BG = "#FFFFFF"


class ServiceManager:
    """Manages a subprocess (backend or frontend)."""

    def __init__(self, name, cmd, cwd, log_callback, status_callback):
        self.name = name
        self.cmd = cmd
        self.cwd = cwd
        self.log_callback = log_callback
        self.status_callback = status_callback
        self.process = None
        self._stop_event = threading.Event()

    @property
    def running(self):
        return self.process is not None and self.process.poll() is None

    def start(self):
        if self.running:
            self.log_callback(f"[{self.name}] 已在运行中\n")
            return
        self._stop_event.clear()
        try:
            self.process = subprocess.Popen(
                self.cmd,
                cwd=self.cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                shell=True,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
                encoding="utf-8",
                errors="replace",
            )
            self.log_callback(f"[{self.name}] 启动中... (PID: {self.process.pid})\n")
            self.status_callback(True)
            # Reader thread
            t = threading.Thread(target=self._read_output, daemon=True)
            t.start()
        except Exception as e:
            self.log_callback(f"[{self.name}] 启动失败: {e}\n")
            self.status_callback(False)

    def stop(self):
        if not self.running:
            self.log_callback(f"[{self.name}] 未在运行\n")
            return
        self._stop_event.set()
        pid = self.process.pid
        self.log_callback(f"[{self.name}] 正在停止... (PID: {pid})\n")
        try:
            # Windows: kill process tree
            subprocess.run(
                f"taskkill /F /T /PID {pid}",
                shell=True,
                capture_output=True,
            )
        except Exception:
            try:
                self.process.kill()
            except Exception:
                pass
        self.process = None
        self.status_callback(False)
        self.log_callback(f"[{self.name}] 已停止\n")

    def _read_output(self):
        try:
            for line in self.process.stdout:
                if self._stop_event.is_set():
                    break
                self.log_callback(f"[{self.name}] {line}")
        except Exception:
            pass
        finally:
            # Process ended on its own
            if not self._stop_event.is_set() and self.process and self.process.poll() is not None:
                code = self.process.poll()
                self.log_callback(f"[{self.name}] 进程已退出 (code: {code})\n")
                self.status_callback(False)


class LauncherApp:
    """Main GUI application."""

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("小微企业财务记账系统 - 服务管理器")
        self.root.geometry("720x580")
        self.root.configure(bg=COLOR_BG)
        self.root.resizable(True, True)
        self.root.minsize(600, 480)

        # Icon (skip if not available)
        try:
            self.root.iconbitmap(default="")
        except Exception:
            pass

        self._build_ui()

        # Service managers
        python_exe = sys.executable
        self.backend = ServiceManager(
            name="后端",
            cmd=f'"{python_exe}" -m app.main',
            cwd=BASE_DIR,
            log_callback=self._append_log,
            status_callback=lambda running: self._update_status(self.backend_indicator, self.backend_status_label, running),
        )
        self.frontend = ServiceManager(
            name="前端",
            cmd="npm run dev",
            cwd=PROJECT_DIR,
            log_callback=self._append_log,
            status_callback=lambda running: self._update_status(self.frontend_indicator, self.frontend_status_label, running),
        )

        # Cleanup on close
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build_ui(self):
        # Title
        title_frame = tk.Frame(self.root, bg=COLOR_BRAND, height=50)
        title_frame.pack(fill=tk.X)
        title_frame.pack_propagate(False)
        tk.Label(
            title_frame,
            text="小微企业财务记账系统 - 服务管理器",
            font=("Microsoft YaHei UI", 14, "bold"),
            fg=COLOR_WHITE,
            bg=COLOR_BRAND,
        ).pack(expand=True)

        # Main content
        content = tk.Frame(self.root, bg=COLOR_BG, padx=16, pady=12)
        content.pack(fill=tk.BOTH, expand=True)

        # --- Backend section ---
        backend_frame = tk.LabelFrame(
            content, text=" 后端服务 (FastAPI :3001) ", font=("Microsoft YaHei UI", 10, "bold"),
            bg=COLOR_SECTION_BG, fg=COLOR_TEXT, padx=12, pady=8,
        )
        backend_frame.pack(fill=tk.X, pady=(0, 8))

        backend_row = tk.Frame(backend_frame, bg=COLOR_SECTION_BG)
        backend_row.pack(fill=tk.X)

        self.backend_indicator = tk.Canvas(backend_row, width=16, height=16, bg=COLOR_SECTION_BG, highlightthickness=0)
        self.backend_indicator.pack(side=tk.LEFT, padx=(0, 6))
        self.backend_indicator.create_oval(2, 2, 14, 14, fill=COLOR_GRAY, outline="", tags="dot")

        self.backend_status_label = tk.Label(backend_row, text="已停止", font=("Microsoft YaHei UI", 9), fg=COLOR_GRAY, bg=COLOR_SECTION_BG, width=6, anchor="w")
        self.backend_status_label.pack(side=tk.LEFT, padx=(0, 12))

        tk.Button(
            backend_row, text="启动", font=("Microsoft YaHei UI", 9), width=8,
            bg="#E6F7E9", fg="#389E0D", activebackground="#B7EB8F", relief=tk.GROOVE,
            command=self._start_backend,
        ).pack(side=tk.LEFT, padx=(0, 6))

        tk.Button(
            backend_row, text="停止", font=("Microsoft YaHei UI", 9), width=8,
            bg="#FFF1F0", fg=COLOR_RED, activebackground="#FFA39E", relief=tk.GROOVE,
            command=self._stop_backend,
        ).pack(side=tk.LEFT)

        # --- Frontend section ---
        frontend_frame = tk.LabelFrame(
            content, text=" 前端服务 (Vite :5173) ", font=("Microsoft YaHei UI", 10, "bold"),
            bg=COLOR_SECTION_BG, fg=COLOR_TEXT, padx=12, pady=8,
        )
        frontend_frame.pack(fill=tk.X, pady=(0, 8))

        frontend_row = tk.Frame(frontend_frame, bg=COLOR_SECTION_BG)
        frontend_row.pack(fill=tk.X)

        self.frontend_indicator = tk.Canvas(frontend_row, width=16, height=16, bg=COLOR_SECTION_BG, highlightthickness=0)
        self.frontend_indicator.pack(side=tk.LEFT, padx=(0, 6))
        self.frontend_indicator.create_oval(2, 2, 14, 14, fill=COLOR_GRAY, outline="", tags="dot")

        self.frontend_status_label = tk.Label(frontend_row, text="已停止", font=("Microsoft YaHei UI", 9), fg=COLOR_GRAY, bg=COLOR_SECTION_BG, width=6, anchor="w")
        self.frontend_status_label.pack(side=tk.LEFT, padx=(0, 12))

        tk.Button(
            frontend_row, text="启动", font=("Microsoft YaHei UI", 9), width=8,
            bg="#E6F7E9", fg="#389E0D", activebackground="#B7EB8F", relief=tk.GROOVE,
            command=self._start_frontend,
        ).pack(side=tk.LEFT, padx=(0, 6))

        tk.Button(
            frontend_row, text="停止", font=("Microsoft YaHei UI", 9), width=8,
            bg="#FFF1F0", fg=COLOR_RED, activebackground="#FFA39E", relief=tk.GROOVE,
            command=self._stop_frontend,
        ).pack(side=tk.LEFT)

        # --- Quick actions ---
        action_frame = tk.LabelFrame(
            content, text=" 快捷操作 ", font=("Microsoft YaHei UI", 10, "bold"),
            bg=COLOR_SECTION_BG, fg=COLOR_TEXT, padx=12, pady=8,
        )
        action_frame.pack(fill=tk.X, pady=(0, 8))

        action_row = tk.Frame(action_frame, bg=COLOR_SECTION_BG)
        action_row.pack(fill=tk.X)

        tk.Button(
            action_row, text="打开前端页面", font=("Microsoft YaHei UI", 9), width=14,
            bg="#E6F0FA", fg=COLOR_BRAND, activebackground="#BAD4ED", relief=tk.GROOVE,
            command=lambda: webbrowser.open("http://localhost:5173"),
        ).pack(side=tk.LEFT, padx=(0, 6))

        tk.Button(
            action_row, text="打开API文档", font=("Microsoft YaHei UI", 9), width=14,
            bg="#E6F0FA", fg=COLOR_BRAND, activebackground="#BAD4ED", relief=tk.GROOVE,
            command=lambda: webbrowser.open("http://localhost:3001/docs"),
        ).pack(side=tk.LEFT, padx=(0, 6))

        tk.Button(
            action_row, text="一键启动全部", font=("Microsoft YaHei UI", 9, "bold"), width=14,
            bg=COLOR_BRAND, fg=COLOR_WHITE, activebackground="#144E8C", relief=tk.GROOVE,
            command=self._start_all,
        ).pack(side=tk.RIGHT)

        tk.Button(
            action_row, text="一键停止全部", font=("Microsoft YaHei UI", 9), width=14,
            bg="#FFF1F0", fg=COLOR_RED, activebackground="#FFA39E", relief=tk.GROOVE,
            command=self._stop_all,
        ).pack(side=tk.RIGHT, padx=(0, 6))

        # --- Log area ---
        log_frame = tk.LabelFrame(
            content, text=" 日志输出 ", font=("Microsoft YaHei UI", 10, "bold"),
            bg=COLOR_SECTION_BG, fg=COLOR_TEXT, padx=8, pady=6,
        )
        log_frame.pack(fill=tk.BOTH, expand=True)

        self.log_text = scrolledtext.ScrolledText(
            log_frame, font=("Consolas", 9), bg="#1E1E1E", fg="#D4D4D4",
            insertbackground=COLOR_WHITE, wrap=tk.WORD, state=tk.DISABLED,
            height=12,
        )
        self.log_text.pack(fill=tk.BOTH, expand=True)

        # Log tag colors
        self.log_text.tag_configure("backend", foreground="#4EC9B0")
        self.log_text.tag_configure("frontend", foreground="#CE9178")

        # Clear log button
        clear_row = tk.Frame(log_frame, bg=COLOR_SECTION_BG)
        clear_row.pack(fill=tk.X, pady=(4, 0))
        tk.Button(
            clear_row, text="清空日志", font=("Microsoft YaHei UI", 8), width=8,
            bg=COLOR_SECTION_BG, fg="#999", relief=tk.FLAT,
            command=self._clear_log,
        ).pack(side=tk.RIGHT)

    # --- Actions ---

    def _start_backend(self):
        threading.Thread(target=self.backend.start, daemon=True).start()

    def _stop_backend(self):
        threading.Thread(target=self.backend.stop, daemon=True).start()

    def _start_frontend(self):
        threading.Thread(target=self.frontend.start, daemon=True).start()

    def _stop_frontend(self):
        threading.Thread(target=self.frontend.stop, daemon=True).start()

    def _start_all(self):
        self._start_backend()
        self._start_frontend()

    def _stop_all(self):
        self._stop_backend()
        self._stop_frontend()

    def _clear_log(self):
        self.log_text.configure(state=tk.NORMAL)
        self.log_text.delete("1.0", tk.END)
        self.log_text.configure(state=tk.DISABLED)

    # --- UI updates (thread-safe) ---

    def _append_log(self, text):
        def _do():
            self.log_text.configure(state=tk.NORMAL)
            tag = None
            if text.startswith("[后端]"):
                tag = "backend"
            elif text.startswith("[前端]"):
                tag = "frontend"
            self.log_text.insert(tk.END, text, tag)
            self.log_text.see(tk.END)
            self.log_text.configure(state=tk.DISABLED)
        self.root.after(0, _do)

    def _update_status(self, canvas, label, running):
        def _do():
            color = COLOR_GREEN if running else COLOR_GRAY
            text = "运行中" if running else "已停止"
            fg = COLOR_GREEN if running else COLOR_GRAY
            canvas.itemconfig("dot", fill=color)
            label.configure(text=text, fg=fg)
        self.root.after(0, _do)

    # --- Cleanup ---

    def _on_close(self):
        self._append_log("[系统] 正在关闭所有服务...\n")
        if self.backend.running:
            self.backend.stop()
        if self.frontend.running:
            self.frontend.stop()
        self.root.destroy()

    def run(self):
        self._append_log("[系统] 服务管理器已启动，请点击按钮启动服务\n")
        self.root.mainloop()


if __name__ == "__main__":
    app = LauncherApp()
    app.run()
