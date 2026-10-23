import * as THREE from 'three';

/** Radio del jugador usado para separar su punto de vista de los obstaculos. */
export const PLAYER_COLLISION_RADIUS = 0.45;

interface CircleCollider {
  type: 'circle';
  center: THREE.Vector3;
  radius: number;
}

interface RectangleCollider {
  type: 'rectangle';
  center: THREE.Vector3;
  halfWidth: number;
  halfDepth: number;
}

type Collider = CircleCollider | RectangleCollider;

/**
 * Colisiones 2D livianas para el plano X/Z. Los colliders son estaticos,
 * adecuados para los elementos del escenario sin incorporar un motor fisico.
 */
export class CollisionSystem {
  private readonly colliders: Collider[] = [];

  addCircle(center: THREE.Vector3, radius: number): void {
    this.colliders.push({ type: 'circle', center: center.clone(), radius });
  }

  addRectangle(
    center: THREE.Vector3,
    width: number,
    depth: number,
  ): void {
    this.colliders.push({
      type: 'rectangle',
      center: center.clone(),
      halfWidth: width / 2,
      halfDepth: depth / 2,
    });
  }

  /**
   * Resuelve el desplazamiento probando primero el movimiento completo y,
   * si esta bloqueado, cada eje por separado para conservar un deslizamiento
   * natural sobre los bordes.
   */
  resolveMovement(
    previous: THREE.Vector3,
    desired: THREE.Vector3,
    playerRadius = PLAYER_COLLISION_RADIUS,
  ): THREE.Vector3 {
    if (!this.isBlocked(desired, playerRadius)) {
      return desired.clone();
    }

    const resolved = previous.clone();
    const xOnly = new THREE.Vector3(desired.x, previous.y, previous.z);
    if (!this.isBlocked(xOnly, playerRadius)) {
      resolved.x = xOnly.x;
    }

    const zOnly = new THREE.Vector3(resolved.x, previous.y, desired.z);
    if (!this.isBlocked(zOnly, playerRadius)) {
      resolved.z = zOnly.z;
    }
    return resolved;
  }

  private isBlocked(position: THREE.Vector3, playerRadius: number): boolean {
    return this.colliders.some((collider) => {
      if (collider.type === 'circle') {
        return (
          Math.hypot(position.x - collider.center.x, position.z - collider.center.z) <
          collider.radius + playerRadius
        );
      }

      return (
        Math.abs(position.x - collider.center.x) < collider.halfWidth + playerRadius &&
        Math.abs(position.z - collider.center.z) < collider.halfDepth + playerRadius
      );
    });
  }
}
