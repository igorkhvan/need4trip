"use client";

/**
 * RichTextEditor - WYSIWYG editor based on Tiptap (ProseMirror)
 *
 * Features:
 * - Bold, Italic, Bullet List, Ordered List, Link
 * - Emoji insertion via native OS picker
 * - Styled to match the project's Textarea component
 *
 * SSOT: docs/ssot/SSOT_DESIGN_SYSTEM.md (RichTextEditor section)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RichTextEditorProps {
  /** Current HTML value */
  value: string;
  /** Called with new HTML on every change */
  onChange: (html: string) => void;
  /** Placeholder when editor is empty */
  placeholder?: string;
  /** Minimum height (CSS value) */
  minHeight?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Extra className for the wrapper */
  className?: string;
  /** Error styling (red border) */
  error?: boolean;
}

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        "hover:bg-[var(--color-bg-subtle)]",
        "disabled:pointer-events-none disabled:opacity-40",
        active && "bg-[var(--color-bg-subtle)] text-[var(--color-primary)]"
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Toolbar separator
// ---------------------------------------------------------------------------

function ToolbarSeparator() {
  return <div className="mx-0.5 h-5 w-px bg-[var(--color-border)]" />;
}

// ---------------------------------------------------------------------------
// Link input popover (inline)
// ---------------------------------------------------------------------------

function LinkPopover({
  initialUrl,
  onSubmit,
  onRemove,
  onCancel,
}: {
  initialUrl: string;
  onSubmit: (url: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (url.trim()) onSubmit(url.trim());
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-white px-2 py-1.5 shadow-sm">
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="https://..."
        className="h-7 w-48 rounded border border-[var(--color-border)] px-2 text-sm outline-none focus:border-[var(--color-primary)]"
      />
      <button
        type="button"
        onClick={() => url.trim() && onSubmit(url.trim())}
        className="h-7 rounded bg-[var(--color-primary)] px-2.5 text-xs font-medium text-white hover:opacity-90"
      >
        OK
      </button>
      {initialUrl && (
        <button
          type="button"
          onClick={onRemove}
          title="Удалить ссылку"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-red-500 hover:bg-red-50"
        >
          <Unlink className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = "96px",
  disabled = false,
  className,
  error = false,
}: RichTextEditorProps) {
  const [showLinkPopover, setShowLinkPopover] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable heading (basic formatting only)
        heading: false,
        // Disable code block (not needed)
        codeBlock: false,
        // Disable horizontal rule
        horizontalRule: false,
        // Disable blockquote (basic formatting only)
        blockquote: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[var(--color-primary)] underline cursor-pointer",
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
        emptyEditorClass:
          "before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none",
      }),
    ],
    content: value || "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none outline-none",
          "px-4 py-3",
          "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1",
          "[&_ul]:list-disc [&_ul]:pl-5",
          "[&_ol]:list-decimal [&_ol]:pl-5",
          "[&_li]:my-0.5",
          "[&_a]:text-[var(--color-primary)] [&_a]:underline",
          "[&_strong]:font-semibold",
          "[&_em]:italic"
        ),
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      // If editor is empty, Tiptap returns "<p></p>" — normalize to ""
      const normalized = html === "<p></p>" ? "" : html;
      onChange(normalized);
    },
    // Prevent React StrictMode double-create issues
    immediatelyRender: false,
  });

  // Sync external value → editor (e.g. when AI generates rules)
  const isInternalUpdate = useRef(false);

  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const currentHtml = editor.getHTML();
    const normalizedCurrent = currentHtml === "<p></p>" ? "" : currentHtml;
    const normalizedValue = value || "";
    if (normalizedCurrent !== normalizedValue) {
      editor.commands.setContent(normalizedValue || "<p></p>", { emitUpdate: false });
    }
  }, [value, editor]);

  // Track internal updates to avoid loop
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      isInternalUpdate.current = true;
    };
    editor.on("update", handler);
    return () => {
      editor.off("update", handler);
    };
  }, [editor]);

  // Sync disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const handleLinkClick = useCallback(() => {
    if (!editor) return;
    setShowLinkPopover((prev) => !prev);
  }, [editor]);

  const submitLink = useCallback(
    (url: string) => {
      if (!editor) return;
      // Add protocol if missing
      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href })
        .run();
      setShowLinkPopover(false);
    },
    [editor]
  );

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setShowLinkPopover(false);
  }, [editor]);

  const insertEmoji = useCallback(() => {
    // Attempt to open native emoji picker by inserting an emoji character
    // On macOS: Ctrl+Cmd+Space, on Windows: Win+.
    // Since we can't programmatically open the OS picker, we insert a common emoji set popover
    // For now, we'll just focus the editor so the user can use the OS shortcut
    editor?.chain().focus().run();

    // Dispatch a keyboard shortcut hint
    const hint =
      navigator.platform.includes("Mac")
        ? "Нажмите Ctrl+Cmd+Space для вставки эмодзи"
        : "Нажмите Win+. для вставки эмодзи";

    // Show a brief toast hint
    const event = new CustomEvent("toast", {
      detail: {
        title: "Вставка эмодзи",
        description: hint,
      },
    });
    window.dispatchEvent(event);
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={cn(
          "flex w-full rounded-xl border border-[var(--color-border)] bg-white",
          "animate-pulse",
          className
        )}
        style={{ minHeight }}
      />
    );
  }

  const currentLinkUrl = editor.isActive("link")
    ? (editor.getAttributes("link").href as string) ?? ""
    : "";

  return (
    <div
      className={cn(
        "w-full rounded-xl border bg-white transition-colors",
        "border-[var(--color-border)]",
        "hover:border-[#D1D5DB]",
        "focus-within:border-[var(--color-primary)]",
        error && "border-red-500 focus-within:border-red-500",
        disabled && "cursor-not-allowed opacity-50 bg-[var(--color-bg-subtle)]",
        className
      )}
    >
      {/* Toolbar */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-0.5 border-b border-[var(--color-border)] px-2 py-1.5",
          disabled && "pointer-events-none"
        )}
      >
        <ToolbarButton
          onClick={toggleBold}
          active={editor.isActive("bold")}
          disabled={disabled}
          title="Жирный (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={toggleItalic}
          active={editor.isActive("italic")}
          disabled={disabled}
          title="Курсив (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={toggleBulletList}
          active={editor.isActive("bulletList")}
          disabled={disabled}
          title="Маркированный список"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={toggleOrderedList}
          active={editor.isActive("orderedList")}
          disabled={disabled}
          title="Нумерованный список"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={handleLinkClick}
          active={editor.isActive("link") || showLinkPopover}
          disabled={disabled}
          title="Ссылка"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton
          onClick={insertEmoji}
          disabled={disabled}
          title="Вставить эмодзи"
        >
          <Smile className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Link Popover */}
      {showLinkPopover && (
        <div className="border-b border-[var(--color-border)] px-2 py-1.5">
          <LinkPopover
            initialUrl={currentLinkUrl}
            onSubmit={submitLink}
            onRemove={removeLink}
            onCancel={() => setShowLinkPopover(false)}
          />
        </div>
      )}

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="text-base text-[var(--color-text)]"
      />
    </div>
  );
}
