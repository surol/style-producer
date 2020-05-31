/**
 * @packageDocumentation
 * @module @proc7ts/style-producer
 */
import { filterIt, itsEmpty, itsReduction, mapIt, overArray } from '@proc7ts/a-iterable';
import { NamespaceDef } from '@proc7ts/namespace-aliaser';
import { isPresent } from '@proc7ts/primitives';
import { StypProperties } from '../../rule';
import { StypSelector } from '../../selector';
import { isCombinator } from '../../selector/selector.impl';
import { StypURL } from '../../value';
import { StypRenderer } from '../renderer';
import { StyleProducer } from '../style-producer';
import { stypRenderGlobals } from './globals.renderer';
import { FIRST_RENDER_ORDER } from './renderer.impl';

/**
 * CSS stylesheet renderer of global XML namespace definitions.
 *
 * Renders `@namespace` declarations for CSS selectors containing namespace definitions.
 *
 * Enabled by default in [[produceStyle]] function.
 *
 * @category Rendering
 */
export const stypRenderXmlNs: StypRenderer = {

  order: FIRST_RENDER_ORDER,

  needs: stypRenderGlobals,

  render(producer: StyleProducer, properties: StypProperties) {

    const xmlNsDefs = extractXmlNsDefs(producer.selector);

    producer.render(itsEmpty(xmlNsDefs) ? properties : declareNss());

    function declareNss(): StypProperties {
      return itsReduction(xmlNsDefs, declareNs, { ...properties });
    }

    function declareNs(result: StypProperties.Mutable, ns: NamespaceDef): StypProperties.Mutable {

      const alias = producer.nsAlias(ns);

      result[`@namespace:${alias}`] = new StypURL(ns.url);

      return result;
    }
  },

};

/**
 * @internal
 */
function extractXmlNsDefs(selector: StypSelector.Normalized): Iterable<NamespaceDef> {
  return filterIt<NamespaceDef | null, NamespaceDef>(
      mapIt(
          overArray(selector),
          part => !isCombinator(part) && part.ns && typeof part.ns !== 'string' ? part.ns : null,
      ),
      isPresent,
  );
}
