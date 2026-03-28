# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - link "Jo" [ref=e5] [cursor=pointer]:
          - /url: /markus
        - generic [ref=e6]:
          - link "Home" [ref=e7] [cursor=pointer]:
            - /url: /markus
          - link "Rezepte" [ref=e8] [cursor=pointer]:
            - /url: /markus/rezepte
          - link "Impostor Game" [ref=e9] [cursor=pointer]:
            - /url: /markus/impostor-game
        - button "Toggle menu" [ref=e10]:
          - img
  - main [ref=e12]:
    - generic [ref=e14]:
      - heading "404" [level=1] [ref=e15]
      - heading "This page could not be found." [level=2] [ref=e17]
  - contentinfo [ref=e18]:
    - generic [ref=e20]:
      - paragraph [ref=e21]: Jo
      - paragraph [ref=e22]: Dein persönlicher AI-Assistent
```