import { describe, expect, it, vi } from 'vitest';
import { createToggle, setToggleState } from '@ui/components/toggle';

describe('createToggle()', () => {
  it('returns a label with toggle class containing checkbox + slider', () => {
    const el = createToggle({ checked: false, onChange: () => {} });
    expect(el.tagName.toLowerCase()).toBe('label');
    expect(el.classList.contains('toggle')).toBe(true);

    const input = el.querySelector<HTMLInputElement>('.toggle__input');
    expect(input).not.toBeNull();
    expect(input!.type).toBe('checkbox');

    const slider = el.querySelector('.toggle__slider');
    expect(slider).not.toBeNull();
  });

  it('checked state: toggle--on class present, input.checked = true', () => {
    const el = createToggle({ checked: true, onChange: () => {} });
    expect(el.classList.contains('toggle--on')).toBe(true);
    const input = el.querySelector<HTMLInputElement>('.toggle__input')!;
    expect(input.checked).toBe(true);
  });

  it('unchecked state: no toggle--on, input.checked = false', () => {
    const el = createToggle({ checked: false, onChange: () => {} });
    expect(el.classList.contains('toggle--on')).toBe(false);
    const input = el.querySelector<HTMLInputElement>('.toggle__input')!;
    expect(input.checked).toBe(false);
  });

  it('small size: toggle--small class', () => {
    const el = createToggle({ checked: false, onChange: () => {}, size: 'small' });
    expect(el.classList.contains('toggle--small')).toBe(true);
  });

  it('onChange fires with correct boolean on change event', () => {
    const onChange = vi.fn();
    const el = createToggle({ checked: false, onChange });
    const input = el.querySelector<HTMLInputElement>('.toggle__input')!;

    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith(true);

    input.checked = false;
    input.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('setToggleState()', () => {
  it('updates input.checked and class', () => {
    const el = createToggle({ checked: false, onChange: () => {} });

    setToggleState(el, true);
    const input = el.querySelector<HTMLInputElement>('.toggle__input')!;
    expect(input.checked).toBe(true);
    expect(el.classList.contains('toggle--on')).toBe(true);

    setToggleState(el, false);
    expect(input.checked).toBe(false);
    expect(el.classList.contains('toggle--on')).toBe(false);
  });

  it('no-op when already in target state', () => {
    const el = createToggle({ checked: true, onChange: () => {} });
    const input = el.querySelector<HTMLInputElement>('.toggle__input')!;

    // Already checked — classList should not change
    const classListBefore = el.className;
    setToggleState(el, true);
    expect(el.className).toBe(classListBefore);
    expect(input.checked).toBe(true);
  });
});
