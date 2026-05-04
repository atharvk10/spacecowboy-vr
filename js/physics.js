// cannon-es world — used for asteroid-asteroid and asteroid-ship physics

import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

export { CANNON };

export const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, 0, 0),
});

world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.defaultContactMaterial.friction = 0.0;
world.defaultContactMaterial.restitution = 0.6;

export const asteroidMaterial = new CANNON.Material('asteroid');
export const shipMaterial = new CANNON.Material('ship');

world.addContactMaterial(new CANNON.ContactMaterial(asteroidMaterial, asteroidMaterial, {
    friction: 0.0,
    restitution: 0.7,
}));

world.addContactMaterial(new CANNON.ContactMaterial(asteroidMaterial, shipMaterial, {
    friction: 0.0,
    restitution: 0.3,
}));

export const shipBody = new CANNON.Body({
    mass: 0,
    material: shipMaterial,
    shape: new CANNON.Sphere(5.5),
});
shipBody.position.set(4.5, 0.5, -4.5);
world.addBody(shipBody);

const FIXED_STEP = 1 / 60;
const MAX_SUBSTEPS = 3;

export function stepWorld(delta) {
    world.step(FIXED_STEP, delta, MAX_SUBSTEPS);
}
