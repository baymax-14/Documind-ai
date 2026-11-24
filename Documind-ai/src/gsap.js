/**
 * The one place GSAP is set up for the app. Import `gsap` and `useGSAP` from
 * here, never from 'gsap' directly, so plugins are registered once and only the
 * plugins actually used end up in the bundle.
 *
 * - ScrambleText: the front page's readouts decode as real browser checks return.
 * - ScrollTo: Compare brings its results into view when they are ready.
 */
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(useGSAP, ScrambleTextPlugin, ScrollToPlugin)

/** Confident arrival, the house ease for entrances (matches cubic-bezier(0.16, 1, 0.3, 1)). */
export const EASE_ARRIVE = 'expo.out'
/** The ledger-stamp press: fast in, hard stop. */
export const EASE_PRESS = 'power3.in'

/** True when the visitor asked for less motion; check at the moment of animating. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export { gsap, useGSAP }
