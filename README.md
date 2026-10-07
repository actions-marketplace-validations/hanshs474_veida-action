# Veida AI Image Generator (GitHub Action)

Generate an image from a prompt inside a workflow with [Veida](https://veida.ai/?utm_source=github-action&utm_medium=package), with no API key and no account. Use it for release banners, blog covers or social cards.

```yaml
- uses: hanshs474/veida-action@v1
  id: cover
  with:
    prompt: "isometric diorama of a ramen shop at night, warm window light"
    aspect-ratio: "16:9"
    output-path: assets/cover.webp
- run: echo "${{ steps.cover.outputs.url }}"
```

## Inputs

| Input | |
|---|---|
| `prompt` | required. What to make |
| `aspect-ratio` | `1:1` (default), `16:9`, `9:16`, `4:3` or `3:4` |
| `output-path` | download the image into the workspace |
| `timeout-minutes` | default 10 |

Outputs: `url` (the finished image) and `path` (if `output-path` was set).

It runs on Veida's anonymous free tier: each run gets one free image on the free engine, and one machine can spend 30 free credits a day. Free images carry a watermark. For larger models such as [GPT Image 2](https://veida.ai/image/gpt-image-2?utm_source=github-action&utm_medium=package) and no watermark, use the [AI image generator](https://veida.ai/image?utm_source=github-action&utm_medium=package) signed in.

The step fails with a clear message when the daily free allowance for the runner is spent or the prompt is refused.

No dependencies; MIT licensed.
