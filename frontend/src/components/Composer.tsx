import { ArrowUp } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

export function Composer({ placeholder, onSend, disabled }: { placeholder: string; onSend: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [text]);
  const send = () => {
    const v = text.trim();
    if (!v || disabled) return;
    onSend(v);
    setText("");
  };
  return (
    <div className="composer-dock">
      <div className="composer">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          placeholder={placeholder}
          aria-label="Message"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="composer-send" type="button" aria-label="Send" onClick={send} disabled={!text.trim() || disabled}>
          <ArrowUp size={17} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
