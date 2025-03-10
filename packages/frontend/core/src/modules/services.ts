import {
  GlobalCache,
  GlobalState,
  type ServiceCollection,
  Workspace,
  WorkspaceScope,
} from '@toeverything/infra';

import { CollectionService } from './collection';
import {
  LocalStorageGlobalCache,
  LocalStorageGlobalState,
} from './infra-web/storage';
import { Workbench } from './workbench';
import {
  CurrentWorkspaceService,
  WorkspaceLegacyProperties,
  WorkspacePropertiesAdapter,
} from './workspace';

export function configureBusinessServices(services: ServiceCollection) {
  services.add(CurrentWorkspaceService);
  services
    .scope(WorkspaceScope)
    .add(Workbench)
    .add(WorkspacePropertiesAdapter, [Workspace])
    .add(CollectionService, [Workspace])
    .add(WorkspaceLegacyProperties, [Workspace]);
}

export function configureWebInfraServices(services: ServiceCollection) {
  services
    .addImpl(GlobalCache, LocalStorageGlobalCache)
    .addImpl(GlobalState, LocalStorageGlobalState);
}
