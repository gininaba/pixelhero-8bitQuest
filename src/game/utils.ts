import { Vec } from './types';

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

let _eid = 2;
export const nextId = () => _eid++;
