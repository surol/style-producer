import { StypProperties, stypRoot, StypRule } from '../rule';
import { produceBasicStyle } from './produce-basic-style';
import { AIterable, itsEmpty, overArray } from 'a-iterable';
import { trackValue } from 'fun-events';
import { cssStyle, cssStyles, scheduleNow } from '../spec';
import SpyInstance = jest.SpyInstance;
import Mock = jest.Mock;
import { StypRender } from './render';
import { StyleProducer } from './style-producer';
import { stypSelector } from '../selector/selector-constructor';

describe('produceBasicStyle', () => {

  let root: StypRule;

  beforeEach(() => {
    root = stypRoot();
  });

  afterEach(() => {
    // Remove `<style>` elements
    AIterable.from(overArray(document.head.querySelectorAll('style'))).forEach(e => e.remove());
  });

  describe('document', () => {
    it('is current one by default', () => {

      const mockRender = jest.fn();

      produceBasicStyle(
          root.rules,
          {
            render: mockRender,
            schedule: scheduleNow,
          });

      expect(mockRender).toHaveBeenCalledWith(
          expect.objectContaining({ document }),
          expect.anything());
    });
  });

  describe('parent', () => {
    it('is document head by default', () => {

      const mockRender = jest.fn();

      produceBasicStyle(
          root.rules,
          {
            render: mockRender,
            schedule: scheduleNow,
          });

      expect(mockRender).toHaveBeenCalledWith(
          expect.objectContaining({ parent: document.head }),
          expect.anything());
    });
  });

  describe('render', () => {

    let mockRender1: Mock<void, Parameters<StypRender.Function>>;
    let mockRender2: Mock<void, Parameters<StypRender.Function>>;

    beforeEach(() => {
      mockRender1 = jest.fn();
      mockRender2 = jest.fn();
    });

    it('passes properties to next render', () => {

      const properties: StypProperties = { $name: 'next' };
      let producer: StyleProducer = null!;

      mockRender1.mockImplementation(_producer => {
        producer = _producer;
        _producer.render(properties);
      });

      testProduceStyle();
      expect(mockRender2).toHaveBeenCalledWith(producer, properties);
    });
    it('passes selector to next render', () => {

      const selector = stypSelector('test');
      let properties: StypProperties = {};
      let producer: StyleProducer = null!;

      mockRender1.mockImplementation((_producer, _properties) => {
        producer = _producer;
        _producer.render(properties = _properties, { selector });
      });

      testProduceStyle();
      expect(mockRender2).toHaveBeenCalledWith(
          expect.objectContaining({ selector, target: producer.target }),
          properties);
    });
    it('passes target to next render', () => {

      const target: CSSStyleSheet = { name: 'stylesheet' } as any;;
      let properties: StypProperties = {};
      let producer: StyleProducer = null!;

      mockRender1.mockImplementation((_producer, _properties) => {
        producer = _producer;
        _producer.render(properties = _properties, { target });
      });

      testProduceStyle();
      expect(mockRender2).toHaveBeenCalledWith(
          expect.objectContaining({ selector: producer.selector, target }),
          properties);
    });

    function testProduceStyle() {
      produceBasicStyle(root.rules, { render: [mockRender1, mockRender2], schedule: scheduleNow });
    }
  });

  describe('default scheduler', () => {

    let rafSpy: SpyInstance<number, [FrameRequestCallback]>;
    let operations: ((time: number) => void)[];

    beforeEach(() => {
      operations = [];
      rafSpy = jest.spyOn(window, 'requestAnimationFrame');
      rafSpy.mockImplementation(callback => {
        operations.push(callback);
        return 0;
      });
    });

    it('schedules in animation frame', () => {
      produceBasicStyle(root.rules);
      expect(rafSpy).toHaveBeenCalledWith(operations[0]);
    });
    it('schedules in current window animation frame for detached document', () => {

      const doc = document.implementation.createHTMLDocument();

      produceBasicStyle(root.rules, { document: doc });
      expect(rafSpy).toHaveBeenCalledWith(operations[0]);
    });
  });

  it('renders body rule by default', () => {
    root.add({ background: 'white' });
    produceBasicStyle(root.rules, { schedule: scheduleNow });
    expect(cssStyle('body').background).toBe('white');
  });
  it('renders top-level rule', () => {
    root.add({ background: 'white' });
    produceBasicStyle(root.rules, { schedule: scheduleNow, rootSelector: '.root' });
    expect(cssStyle('.root').background).toBe('white');
  });
  it('renders rule', () => {
    root.addRule({ c: 'custom' }, { display: 'block' });
    produceBasicStyle(root.rules, { schedule: scheduleNow });
    expect(cssStyle('.custom').display).toBe('block');
  });
  it('renders important properties', () => {
    root.addRule({ c: 'custom' }, { fontSize: '12px !important' });
    produceBasicStyle(root.rules, { schedule: scheduleNow });

    const style = cssStyle('.custom');

    expect(style.getPropertyValue('font-size')).toBe('12px');
    expect(style.getPropertyPriority('font-size')).toBe('important');
  });
  it('appends rule', () => {
    produceBasicStyle(root.rules, { schedule: scheduleNow });
    root.addRule({ c: 'custom' }, { display: 'block' });
    expect(cssStyle('.custom').display).toBe('block');
  });
  it('updates rule', () => {

    const properties = trackValue<StypProperties>({ display: 'block' });

    root.addRule({ c: 'custom' }, properties);
    produceBasicStyle(root.rules, { schedule: scheduleNow });
    properties.it = { display: 'inline-block' };

    expect(cssStyle('.custom').display).toBe('inline-block');
  });
  it('removes rule', () => {

    const rule = root.addRule({ c: 'custom' }, { display: 'block' });
    const interest = produceBasicStyle(root.rules, { schedule: scheduleNow });
    const onDone = jest.fn();

    interest.whenDone(onDone);
    rule.remove();

    expect(onDone).not.toHaveBeenCalled();
    expect(itsEmpty(cssStyles('.custom'))).toBe(true);
  });
  it('does not re-renders too often', () => {

    const operations: (() => void)[] = [];
    const mockScheduler = jest.fn<void, [() => void]>();

    mockScheduler.mockImplementation(operation => operations.push(operation));

    const mockRender = jest.fn();
    const properties = trackValue<StypProperties>({ display: 'block' });
    const rule = root.addRule({ c: 'custom' }, properties);

    produceBasicStyle(rule.rules, { schedule: mockScheduler, render: mockRender });
    properties.it = { display: 'inline-block' };

    expect(operations).toHaveLength(2);

    operations.forEach(operation => operation());
    expect(mockRender).toHaveBeenCalledTimes(1);
  });
  it('removes styles when updates interest is lost', () => {

    const properties = trackValue<StypProperties>({ display: 'block' });

    root.addRule({ c: 'custom' }, properties);
    produceBasicStyle(root.rules, { schedule: scheduleNow }).off();

    properties.it = { display: 'inline-block' };
    expect(itsEmpty(cssStyles())).toBe(true);
  });
});