import { h } from '@ui/dom';

export interface ToggleOptions {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'normal' | 'small';
}

export function createToggle({ checked, onChange, size = 'normal' }: ToggleOptions): HTMLElement {
  const input = h('input', {
    type: 'checkbox',
    class: 'toggle__input',
    ...(checked && { checked: true }),
    onChange: (e: Event) => {
      const target = e.target as HTMLInputElement;
      label.classList.toggle('toggle--on', target.checked);
      onChange(target.checked);
    },
  }) as HTMLInputElement;

  const slider = h('span', { class: 'toggle__slider' });

  const label = h(
    'label',
    { class: `toggle ${size === 'small' ? 'toggle--small' : ''} ${checked ? 'toggle--on' : ''}` },
    input,
    slider,
  );

  return label;
}

export function setToggleState(toggle: HTMLElement, checked: boolean): void {
  const input = toggle.querySelector<HTMLInputElement>('.toggle__input');
  if (input && input.checked !== checked) {
    input.checked = checked;
    toggle.classList.toggle('toggle--on', checked);
  }
}
