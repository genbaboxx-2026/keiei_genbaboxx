"use client";

import { useState, useRef, useEffect } from "react";
import { formatNumber, parseNumber } from "@/lib/format";

interface EditableCellProps {
  value: string | number;
  type?: "text" | "number";
  onChange: (value: string | number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function EditableCell({
  value,
  type = "text",
  onChange,
  disabled = false,
  className = "",
  placeholder = "",
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value ?? ""));
    }
  }, [value, isEditing]);

  const displayValue =
    type === "number" && !isEditing
      ? formatNumber(typeof value === "number" ? value : parseNumber(String(value)))
      : String(value ?? "");

  const handleClick = () => {
    if (disabled) return;
    setEditValue(type === "number" ? String(value ?? 0) : String(value ?? ""));
    setIsEditing(true);
  };

  const commit = () => {
    setIsEditing(false);
    if (type === "number") {
      onChange(parseNumber(editValue));
    } else {
      onChange(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") {
      commit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(String(value ?? ""));
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type === "number" ? "text" : "text"}
        inputMode={type === "number" ? "numeric" : "text"}
        className={`w-full h-full px-2 py-1 text-sm border border-blue-400 rounded outline-none bg-white ${type === "number" ? "text-right" : ""} ${className}`}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`w-full h-full px-2 py-1 text-sm cursor-pointer hover:bg-blue-50 rounded min-h-[32px] flex items-center ${type === "number" ? "justify-end tabular-nums" : ""} ${disabled ? "cursor-default bg-slate-50 text-slate-500" : ""} ${className}`}
    >
      {displayValue || <span className="text-slate-300">{placeholder || "-"}</span>}
    </div>
  );
}

interface SelectCellProps {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SelectCell({ value, options, onChange, disabled }: SelectCellProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-full px-1 py-1 text-sm border-0 bg-transparent cursor-pointer hover:bg-blue-50 rounded outline-none focus:ring-1 focus:ring-blue-400"
    >
      <option value="">選択...</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
