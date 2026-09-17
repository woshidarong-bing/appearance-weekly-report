"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

export default function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = `${Math.max(44, ref.current.scrollHeight + 2)}px`;
  };

  useLayoutEffect(resize, [props.value]);

  return <textarea {...props} ref={ref} rows={1} onInput={(event) => { resize(); props.onInput?.(event); }} />;
}
