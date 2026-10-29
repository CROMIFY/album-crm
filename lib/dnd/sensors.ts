"use client";

import { useCallback, useRef, useState } from "react";
import {
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type AutoScrollOptions,
  type CollisionDetection,
  type DragStartEvent,
} from "@dnd-kit/core";

/** Con ratón: el arrastre empieza tras mover 8 px (un clic sigue abriendo la tarjeta). */
export const MOUSE_ACTIVATION = { distance: 8 };

/** Con el dedo, sobre el asa: pulsación de 250 ms sin moverse más de 5 px. */
export const TOUCH_ACTIVATION = { delay: 250, tolerance: 5 };

/** Marca del asa de arrastre de una tarjeta (la única zona desde la que se arrastra con el dedo). */
export const DRAG_HANDLE_ATTR = "data-drag-handle";

/**
 * TouchSensor que solo arranca si el dedo empieza en el asa. Sobre el resto de
 * la tarjeta el dedo hace scroll y nunca arrastra: con una pulsación larga en
 * toda la tarjeta, un deslizamiento lento acababa arrastrando, porque el
 * navegador no pasa a la página los primeros ~15 px del gesto y la tolerancia
 * de 5 px no llegaba a saltar.
 */
export class HandleTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: (...args: Parameters<(typeof TouchSensor.activators)[number]["handler"]>) => {
        const target = args[0].nativeEvent.target;
        if (!(target instanceof Element) || !target.closest(`[${DRAG_HANDLE_ATTR}]`)) return false;
        return TouchSensor.activators[0].handler(...args);
      },
    },
  ];
}

export function useBoardSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: MOUSE_ACTIVATION }),
    useSensor(HandleTouchSensor, { activationConstraint: TOUCH_ACTIVATION })
  );
}

// Con el dedo el auto-scroll por defecto (10) cruza el tablero entero en un instante:
// más lento y con una franja de borde más estrecha para poder soltar en la columna de al lado.
const TOUCH_AUTO_SCROLL: AutoScrollOptions = { acceleration: 3, threshold: { x: 0.12, y: 0.15 } };

/**
 * Con el dedo, la tarjeta que se arrastra ocupa casi todo el ancho de la pantalla
 * y el «choque por área» (rectIntersection) casi nunca elige la columna de al lado:
 * en arrastres táctiles manda la columna que está bajo el dedo, y el auto-scroll va
 * más despacio. Con ratón no cambia nada.
 */
export function useTouchAwareCollision() {
  const touchDrag = useRef(false);
  const [isTouchDrag, setIsTouchDrag] = useState(false);

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    if (touchDrag.current) {
      const underFinger = pointerWithin(args);
      if (underFinger.length > 0) return underFinger;
    }
    return rectIntersection(args);
  }, []);

  const rememberActivator = useCallback((event: DragStartEvent) => {
    touchDrag.current = typeof TouchEvent !== "undefined" && event.activatorEvent instanceof TouchEvent;
    setIsTouchDrag(touchDrag.current);
  }, []);

  return { collisionDetection, rememberActivator, autoScroll: isTouchDrag ? TOUCH_AUTO_SCROLL : true };
}
