export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <p>
          Game data from{" "}
          <a href="https://www.communitydragon.org/" className="underline-offset-4 hover:underline">
            CommunityDragon
          </a>
          . Open source on{" "}
          <a href="https://github.com/zhenga8533/tfteam-builder" className="underline-offset-4 hover:underline">
            GitHub
          </a>
          .
        </p>
        <p>
          TFTeam Builder isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone
          officially involved in producing or managing Riot Games properties.
        </p>
      </div>
    </footer>
  );
}
