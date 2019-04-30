import { NamespaceAliaser, NamespaceDef, newNamespaceAliaser } from '../ns';
import { StypSelector } from '../selector';
import { StypRender } from './render';
import { StyleProducer } from './style-producer';
import { stypRenderXmlNs } from './xml-ns.render';
import Mocked = jest.Mocked;

describe('stypRenderXmlNs', () => {

  let sheet: Mocked<CSSStyleSheet>;
  let producer: Mocked<StyleProducer>;
  let nsAlias: NamespaceAliaser;
  let selector: StypSelector.Normalized;

  beforeEach(() => {
    sheet = {
      insertRule: jest.fn((rule: string, index: string) => {
        return index;
      }),
    } as any;
    selector = [];
    nsAlias = newNamespaceAliaser();
    producer = {
      styleSheet: sheet,
      get selector() {
        return selector;
      },
      nsAlias,
      render: jest.fn(),
    } as any;
  });

  let render: StypRender.Function;

  beforeEach(() => {

    const renderDesc = stypRenderXmlNs as StypRender.Descriptor;

    render = renderDesc.render.bind(renderDesc);
  });

  it('renders XML namespaces', () => {

    const ns = new NamespaceDef('test/ns', 'test');

    selector = [{ ns: ns, e: 'some' }];

    render(producer, { property: 'value' });
    expect(producer.render).toHaveBeenCalledWith({
      '@namespace:test': 'test/ns',
      property: 'value'
    });
  });
});