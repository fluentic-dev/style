import { combineStyle, type StyleProp, type StyleTheme } from '@fluentic/style';
import { useEffect, useState } from 'react';
import ReactSelect from 'react-select';
import { selectCompactMenuSheet, selectCompactSheet, selectMenuSheet, selectSheet } from './Select.style';
import { useStyleTarget } from './useStyleTarget';

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = {
  options: SelectOption[];
  defaultValue: SelectOption;
  placeholder?: string;
  compact?: boolean;
  portal?: boolean;
  css?: StyleProp;
  theme?: StyleTheme;
};

export const Select = (props: SelectProps) => {
  const styleTarget = useStyleTarget();
  const portalTarget = usePortalTarget();
  const rootCss = combineStyle(
    selectSheet,
    props.theme,
    props.compact && selectCompactSheet,
    selectMenuSheet,
    props.compact && selectCompactMenuSheet,
  );
  const bodyCss = combineStyle(
    selectMenuSheet,
    props.theme,
    props.compact && selectCompactMenuSheet,
  );

  styleTarget.apply(portalTarget, bodyCss, {
    enabled: props.portal,
  });

  return (
    <div css={[rootCss, props.css]}>
      <ReactSelect<SelectOption, false>
        classNamePrefix='fluentic-select'
        defaultValue={props.defaultValue}
        isSearchable
        menuPortalTarget={props.portal ? portalTarget : null}
        menuPosition={props.portal ? 'fixed' : 'absolute'}
        options={props.options}
        placeholder={props.placeholder}
        unstyled
      />
    </div>
  );
};

const usePortalTarget = () => {
  const [target] = useState(() => {
    return typeof document === 'undefined' ? null : document.createElement('div');
  });

  useEffect(() => {
    if (!target) return;

    document.body.appendChild(target);

    return () => {
      target.remove();
    };
  }, [target]);

  return target;
};
