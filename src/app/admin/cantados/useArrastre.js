// Arrastre con eventos de puntero (sirve con el dedo; el drag and drop nativo no). Spec cabina §4 «Arrastre».
// Se arrastra desde un asa (⠿) con touch-action: none, así el resto de la tarjeta sigue haciendo scroll.
import { useCallback, useEffect, useRef, useState } from "react";
import { destinoDeHueco, esDelArrastre, huecoEn, velocidadBorde } from "../lib/arrastre.js";

export function useArrastre(n, onSoltar, desactivado = false) {
  const items = useRef([]);      // <li> por índice
  const vivo = useRef(null);     // { de, hueco, y, raf, pointerId } mientras se arrastra
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
  // Corta el arrastre vivo (si hay) sin soltar; devuelve el que había. Solo usa refs: es estable.
  const cortar = useCallback(() => {
    const v = vivo.current;
    if (!v) return null;
    cancelAnimationFrame(v.raf);
    vivo.current = null;
    setEstado({ de: null, hueco: null });
    return v;
  }, []);
  function terminar(soltar) {
    const v = cortar();
    if (!v) return;
    const a = destinoDeHueco(v.de, v.hueco);
    if (soltar && a !== v.de) onSoltar(v.de, a);
  }
  // Si la pantalla se bloquea a mitad del arrastre (el asa queda disabled y puede no llegar el pointerup), se corta.
  useEffect(() => {
    if (desactivado) cortar();
  }, [desactivado, cortar]);
  // Si cambia el número de tarjetas o el componente se desmonta con la captura activa, también se corta.
  useEffect(() => cortar, [n, cortar]);

  const delArrastre = (e) => esDelArrastre(vivo.current, e.pointerId);   // un segundo dedo no suelta ni cancela
  const asa = (i) => ({
    style: { touchAction: "none" },
    onPointerDown: (e) => {
      if (desactivado || vivo.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      vivo.current = { de: i, hueco: i, y: e.clientY, raf: 0, pointerId: e.pointerId };
      vivo.current.raf = requestAnimationFrame(cuadro);
      setEstado({ de: i, hueco: i });
    },
    onPointerMove: (e) => {
      if (!delArrastre(e)) return;
      vivo.current.y = e.clientY;
      recalcular();
    },
    onPointerUp: (e) => delArrastre(e) && terminar(true),
    onPointerCancel: (e) => delArrastre(e) && terminar(false),
    onLostPointerCapture: (e) => delArrastre(e) && terminar(false),   // tras pointerup ya no hay arrastre vivo: no hace nada
  });
  return { registrar, asa, de: estado.de, hueco: estado.hueco };
}
