# load all the model classes on startup to avoid problems with Marshal.load
# egrep -r '^class' app/models | cut -d' ' -f2 | ruby -pe '$_ = $_.strip + ",\n"'
[Activity,
 ActivityHint,
 Artist,
 Blockly,
 Calc,
 Callout,
 Concept,
 DSLDefined,
 Eval,
 ExperimentActivity,
 Follower,
 FrequentUnsuccessfulLevelSource,
 Game,
 Grid,
 Karel,
 Level,
 LevelSource,
 LevelSourceHint,
 LevelSourceImage,
 Match,
 Maze,
 Multi,
 NetSim,
 Prize,
 PrizeProvider,
 Script,
 ScriptLevel,
 SecretPicture,
 SecretWord,
 Section,
 Stage,
 Studio,
 TeacherBonusPrize,
 TeacherPrize,
 TextMatch,
 Unplugged,
 User,
 UserLevel,
 UserScript,
 Video].each(&:new) if Dashboard::Application.config.eager_load
