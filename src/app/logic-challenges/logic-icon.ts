import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  LucideAlignHorizontalSpaceAround,
  LucideApple,
  LucideBanana,
  LucideBinary,
  LucideBlocks,
  LucideBot,
  LucideBox,
  LucideBrickWall,
  LucideCastle,
  LucideCat,
  LucideChefHat,
  LucideCircle,
  LucideCircleDot,
  LucideCompass,
  LucideCrown,
  LucideDog,
  LucideDynamicIcon,
  LucideFlag,
  LucideFootprints,
  LucideHardHat,
  LucideHatGlasses,
  LucideHouse,
  LucideKeyRound,
  LucideLightbulb,
  LucideListOrdered,
  LucideMap,
  LucidePalette,
  LucidePawPrint,
  LucideRabbit,
  LucideScale,
  LucideSearch,
  LucideSettings,
  LucideShirt,
  LucideSparkles,
  LucideStar,
  LucideTarget,
  LucideWrench,
  type LucideIconData,
} from '@lucide/angular';
import { LogicIconName } from './logic-exercise';

const ICONS: Record<LogicIconName, LucideIconData> = {
  search: LucideSearch.icon,
  compass: LucideCompass.icon,
  castle: LucideCastle.icon,
  circle: LucideCircle.icon,
  box: LucideBox.icon,
  footprints: LucideFootprints.icon,
  scale: LucideScale.icon,
  mirror: LucideAlignHorizontalSpaceAround.icon,
  house: LucideHouse.icon,
  settings: LucideSettings.icon,
  target: LucideTarget.icon,
  venn: LucideCircleDot.icon,
  bridge: LucideAlignHorizontalSpaceAround.icon,
  bot: LucideBot.icon,
  binary: LucideBinary.icon,
  palette: LucidePalette.icon,
  blocks: LucideBlocks.icon,
  sparkles: LucideSparkles.icon,
  paw: LucidePawPrint.icon,
  wrench: LucideWrench.icon,
  map: LucideMap.icon,
  key: LucideKeyRound.icon,
  sequence: LucideListOrdered.icon,
  crown: LucideCrown.icon,
  shirt: LucideShirt.icon,
  fox: LucideDog.icon,
  cat: LucideCat.icon,
  rabbit: LucideRabbit.icon,
  dog: LucideDog.icon,
  hat: LucideHatGlasses.icon,
  'hard-hat': LucideHardHat.icon,
  'chef-hat': LucideChefHat.icon,
  apple: LucideApple.icon,
  banana: LucideBanana.icon,
  lightbulb: LucideLightbulb.icon,
  flag: LucideFlag.icon,
  star: LucideStar.icon,
  wall: LucideBrickWall.icon,
};

@Component({
  selector: 'app-logic-icon',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', '[attr.data-icon]': 'name()' },
  template: `<svg [lucideIcon]="icons[name()]" aria-hidden="true"></svg>`,
  styles: `
    :host {
      display: inline-flex;
      width: 1em;
      height: 1em;
      flex: 0 0 auto;
      vertical-align: -0.125em;
      color: inherit;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class LogicIcon {
  readonly name = input.required<LogicIconName>();
  protected readonly icons = ICONS;
}
