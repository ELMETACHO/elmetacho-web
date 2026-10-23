// Arrastre con eventos de puntero (sirve con el dedo; el drag and drop nativo no). Spec cabina §4 «Arrastre».
// Se arrastra desde un asa (⠿) con touch-action: none, así el resto de la tarjeta sigue haciendo scroll.
import { useEffect, useRef, useState } from "react";
import { destinoDeHueco, huecoEn, velocidadBorde } from "../lib/arrastre.js";

export function useArrastre(n, onSoltar, desactivado = false) {
  const items = useRef([]);      // <li> por índice
  const vivo = useRef(null);     // { de, hueco, y, raf } mientras se arrastra
  const [estado, setEstado] = useState({ de: null, hueco: null });

  const registrar = (i) => (el) => {
    items.current[i] = el;
  };
  function recalcular() {
    const v = vivo.current;
    if (!v) return;
    const centros = items.current.slice(0, n).map((el) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2;
    });
    const hueco = huecoEn(centros, v.y);
    if (hueco !== v.hueco) {
      v.hueco = hueco;
      setEstado({ de: v.de, hueco });
    }
  }
  function cuadro() {
    const v = vivo.current;
    if (!v) return;
    const paso = velocidadBorde(v.y, window.innerHeight);   // cerca del borde la página se desplaza sola
    if (paso) {
      window.scrollBy(0, paso);
      recalcular();
    }
    v.raf = requestAnimationFrame(cuadro);
  }
  function terminar(soltar) {
    const v = vivo.current;
    if (!v) return;
    cancelAnimationFrame(v.raf);
    vivo.current = null;
    setEstado({ de: null, hueco: null });
    const a = destinoDeHueco(v.de, v.hueco);
    if (soltar && a !== v.de) onSoltar(v.de, a);
  }
  useEffect(() => () => {
    if (vivo.current) cancelAnimationFrame(vivo.current.raf);
  }, []);

  const asa = (i) => ({
    style: { touchAction: "none" },
    onPointerDown: (e) => {
      if (desactivado || vivo.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      vivo.current = { de: i, hueco: i, y: e.clientY, raf: 0 };
      vivo.current.raf = requestAnimationFrame(cuadro);
      setEstado({ de: i, hueco: i });
    },
    onPointerMove: (e) => {
      if (!vivo.current) return;
      vivo.current.y = e.clientY;
      recalcular();
    },
    onPointerUp: () => terminar(true),
    onPointerCancel: () => terminar(false),
    onLostPointerCapture: () => terminar(false),   // tras pointerup ya no hay arrastre vivo: no hace nada
  });
  return { registrar, asa, de: estado.de, hueco: estado.hueco };
}
