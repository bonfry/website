# Comments

Talks and blog posts share the Giscus configuration in
`src/components/GiscusComments.astro`. No tokens or environment variables are required.

## GitHub setup

Setup is complete: Discussions is enabled, the owner has installed Giscus, and the
**Comments** category is configured with ID `DIC_kwDOSZ_RRM4DKZQA`.
If moving repositories or categories, use https://giscus.app to obtain the new
repository and category IDs and update the component's constants.

Comments load locally and in production;
the backlink always points to the canonical URL on `https://bonfry.com`.
The GitHub Discussions link remains available if third-party scripts are blocked.

Comments and reactions are public and require GitHub authorization. Giscus creates
a discussion on the first comment or reaction, so local interactive testing also
writes to the real repository. Read-only widget checks do not create discussions.

## Verification

- Run `npm run build && npm test` to verify the configured widget on every detail page.
- Check one blog post and one talk in a browser, including mobile width and blocked
  third-party scripts. Leave posting and OAuth authorization to the site owner.

Discussion keys are `blog/<content-id>` and `talks/<content-id>`. Keep those keys
stable: renaming a content ID requires migrating its discussion mapping.
Moderate comments on GitHub. Removing the two component usages disables the widget
without deleting any discussions. Deployment uses the existing GitHub Pages workflow.
