export abstract class AbstractEntity {
  [key: string]: unknown;
  clone(entity: AbstractEntity): AbstractEntity {
    for (const field of Reflect.ownKeys(entity)) {
      if ((this as Record<string | symbol, unknown>)[field] == null) {
        (this as Record<string | symbol, unknown>)[field] = (entity as unknown as Record<string | symbol, unknown>)[field];
      }
    }
    return this;
  }

  newClone(): Record<string, unknown> {
    const cloneObj: Record<string, unknown> = {};
    for (const field of Reflect.ownKeys(this)) {
      cloneObj[field as string] = (this as Record<string | symbol, unknown>)[field];
    }
    return cloneObj;
  }

  update(entity: Record<string, unknown>): AbstractEntity {
    for (const field of Reflect.ownKeys(entity)) {
      if ((this as Record<string | symbol, unknown>)[field] != null) {
        (this as Record<string | symbol, unknown>)[field] = entity[field as string];
      }
    }
    return this;
  }

  buildEntity(entity: Record<string, unknown>): void {
    Object.keys(entity).forEach((key) => {
      (this as Record<string, unknown>)[key] = entity[key];
    });
  }

  clearFields(): void {
    for (const field of Reflect.ownKeys(this)) {
      (this as Record<string | symbol, unknown>)[field] = null;
    }
  }
}
