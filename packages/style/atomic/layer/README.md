# Layer priority

Layer priority is a nested cascade model. It is not a flat score.

Lower items are emitted first. Higher items win later in the cascade.

```txt
value weight
└─ direct selector bucket
   └─ parent selector bucket
      └─ media bucket
         └─ property bucket
```

## Order

```txt
value weight 0
  base
    base media
    base weighted media

  parent selector
    parent selector media
    parent selector weighted media

  direct selector
    direct selector media
    direct selector weighted media

  parent + direct selector
    parent + direct selector media
    parent + direct selector weighted media

  priority direct selector
    priority direct selector media
    priority direct selector weighted media

value weight 1
  ...same expansion...

value weight 2
  ...same expansion...
```

## Rules

- Explicit value weight is the outermost override. A higher value weight wins over every lower value weight.
- Equal value weights still fall through to selector, parent selector, media, and property ordering.
- Media is only a convenience override inside the same selector bucket.
- Weighted media beats unweighted media only inside the same selector and parent-selector bucket.
- Base media cannot beat a direct selector.
- Parent selector, even with priority, cannot beat a direct selector bucket.
- Direct selector media cannot beat a priority direct selector.
- Parent + direct selector beats direct selector alone, but still cannot beat a higher direct selector priority bucket.
- Property order is always the innermost bucket: shorthand < intermediate < longhand.

## Tuple

`LayerPriority` stores the model as:

```ts
[
  value,
  selector,
  parentSelector,
  media,
  atRule,
  origin,
  property,
]
```

The comparator reads that tuple in order. Do not move media before selector:
that would let media cross selector buckets, which breaks the intended model.

## Examples

```txt
base color
base media color
direct hover color
```

The media rule wins over base, but it does not win over hover.

```txt
hover color
hover media color
```

The media rule wins because it is inside the same direct selector bucket.

```txt
parent hover color
direct hover color
```

The direct selector wins. Parent selector is context, not a stronger direct
state.

```txt
direct hover color
parent hover + direct hover color
```

The combined parent + direct selector wins because it is a narrower context
inside the same direct selector bucket.

```txt
value weight 1 base color
value weight 2 parent + priority selector media color
```

The value weight 2 rule wins. Different explicit value weights are resolved
before any selector or media bucket is considered.
