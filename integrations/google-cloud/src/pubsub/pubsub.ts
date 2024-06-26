/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  TenantNodeIntegrationInstaller,
  TenantNodeIntegrationContext,
  IntegrationApi,
  OfferChange,
  OfferChangeType,
  PluggableFactory,
  loglevel,
} from 'opr-core';
import {PubSub, ClientConfig, ServiceError} from '@google-cloud/pubsub';

export const PubSubIntegration = {
  async construct(
    json: PubSubConfig,
    context: TenantNodeIntegrationContext
  ): Promise<TenantNodeIntegrationInstaller> {
    return {
      type: 'integrationInstaller',

      async install(api: IntegrationApi): Promise<void> {
        const logger = loglevel.getLogger('PubSub');

        const postCallback = (err: ServiceError | null) => {
          if (err) {
            logger.error(`Callback Error: ${err}`);
          }
        };

        const changeHandler = async (change: OfferChange) => {
          if (!json.events || json.events.includes(change.type)) {
            try {
              logger.info('Sending message');
              const pubsub = new PubSub(json.clientConfig);
              const topic = pubsub.topic(json.topicNameOrId);
              const data = JSON.stringify({
                hostUrl: context.hostOrgUrl,
                changeType: change.type,
                timestampUTC: change.timestampUTC,
                offerId: change.newValue?.id ?? change.oldValue?.id,
                offer: change.newValue ?? change.oldValue,
              });
              topic.publishMessage(
                {
                  data: Buffer.from(data),
                },
                postCallback
              );
            } catch (error) {
              logger.error(`Error: ${error}`);
            }
          }
        };

        api.registerChangeHandler(changeHandler);
      },
    };
  },
} as PluggableFactory<
  TenantNodeIntegrationInstaller,
  PubSubConfig,
  TenantNodeIntegrationContext
>;

export interface PubSubConfig {
  clientConfig: ClientConfig;
  topicNameOrId: string;
  events?: Array<OfferChangeType>;
}
