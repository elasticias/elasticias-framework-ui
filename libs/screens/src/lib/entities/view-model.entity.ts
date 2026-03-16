import { AbstractEntity } from '../abstract/abstract.entity';

export class ViewModelEntity extends AbstractEntity {
  constructor(entity: Record<string, unknown>) {
    super();
    this.clone(entity as unknown as AbstractEntity);
  }
}
