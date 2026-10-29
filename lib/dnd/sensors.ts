"use client";

import { useCallback, useRef } from "react";
import {
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragStartEvent,
} from "@dnd-kit/core";

/** Con ratón: el arrastre empieza tras mover 8 px (un clic sigue abriendo la tarjeta). */
export const MOUSE_ACTIVATION = { distance: 8 };

/**
 * Con el dedo: solo con pulsación larga (250 ms sin moverse más de 5 px). Si el
 * dedo se mueve antes, es un scroll y la tarjeta no se toca. Por eso no se usa
 * PointerSensor (el táctil también son eventos pointer y arrastraba al hacer
 * scroll) ni `touch-action: none` en la tarjeta.
 */
export const TOUCH_ACTIVATION = { delay: 250, tolerance: 5 };

export function useBoardSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: MOUSE_ACTIVATION }),
    useSensor(TouchSensor, { activationConstraint: TOUCH_ACTIVATION })
  );
}

/**
 * Con el dedo, la tarjeta que se arrastra ocupa casi todo el ancho de la pantalla
 * y el «choque por área» (rectIntersection) casi nunca elige la columna de al lado:
 * en arrastres táctiles manda la columna que está bajo el dedo. Con ratón no cambia nada.
 */
export function useTouchAwareCollision() {
  const touchDrag = useRef(false);

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    if (touchDrag.current) {
      const underFinger = pointerWithin(args);
      if (underFinger.length > 0) return underFinger;
    }
    return rectIntersection(args);
  }, []);

  const rememberActivator = useCallback((event: DragStartEvent) => {
    touchDrag.current = typeof TouchEvent !== "undefined" && event.activatorEvent instanceof TouchEvent;
  }, []);

  return { collisionDetection, rememberActivator };
}
