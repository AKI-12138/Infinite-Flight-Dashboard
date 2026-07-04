import { useEffect, useRef, useState } from 'react';
import { _onToast, type ToastVariant } from '../lib/toast';

// トースト表示部（旧 render.js の #toast + キュー方式を移植）。
// 表示中に次の通知が来たら、現在のが消えてから順に出す（部品は 1 個だけ）。
export function Toast() {
  const [msg, setMsg] = useState('');
  const [variant, setVariant] = useState<ToastVariant | undefined>(undefined);
  const [show, setShow] = useState(false);
  const queue = useRef<{ msg: string; variant?: ToastVariant; duration: number }[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    function drain() {
      const next = queue.current.shift();
      if (!next) { timer.current = null; return; }
      setMsg(next.msg);
      setVariant(next.variant);
      setShow(true);
      timer.current = window.setTimeout(() => {
        setShow(false);
        // フェードアウト（CSS 0.4s）を待ってから次の通知へ
        timer.current = window.setTimeout(drain, 450);
      }, next.duration);
    }
    const off = _onToast((m, v, d) => {
      queue.current.push({ msg: m, variant: v, duration: d });
      if (timer.current == null) drain();
    });
    return () => {
      off();
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className={'toast' + (variant === 'red' ? ' toast-red' : '') + (show ? ' show' : '')}>
      {msg}
    </div>
  );
}
