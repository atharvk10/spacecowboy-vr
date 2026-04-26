// cannon-es physics world — asteroids and player body

import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

export { CANNON };

export const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, 0, 0), //no gravity for space
});

world.broadphase = new CANNON.SAPBroadphase(world);
world.allowSleep = true;
world.defaultContactMaterial.friction = 0.0;
world.defaultContactMaterial.restitution = 0.6; 


export const asteroidMaterial = new CANNON.Material('asteroid');
export const playerMaterial   = new CANNON.Material('player');
export const floorMaterial    = new CANNON.Material('floor');

world.addContactMaterial(new CANNON.ContactMaterial(asteroidMaterial, asteroidMaterial, {
    friction: 0.0,
    restitution: 0.7,
}));

world.addContactMaterial(new CANNON.ContactMaterial(playerMaterial, floorMaterial, {
    friction: 0.0,
    restitution: 0.0,
}));

const floorBody = new CANNON.Body({
    mass: 0, 
    material: floorMaterial,
    shape: new CANNON.Plane(),
});

floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
floorBody.position.set(0, 0, 0);
world.addBody(floorBody);

export const shipMaterial = new CANNON.Material('ship');
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

const FIXED_STEP  = 1 / 60;
const MAX_SUBSTEPS = 3;

export function stepWorld(delta) {
    world.step(FIXED_STEP, delta, MAX_SUBSTEPS);
}
