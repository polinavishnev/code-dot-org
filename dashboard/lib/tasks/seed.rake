require "csv"

namespace :seed do
  verbose false

  task videos: :environment do
    Video.setup
  end

  task concepts: :environment do
    Concept.setup
  end

  task games: :environment do
    Game.setup
  end

  SCRIPTS_GLOB = Dir.glob('config/scripts/**/*.script').sort.flatten
  SEEDED = 'config/scripts/.seeded'

  file SEEDED => [SCRIPTS_GLOB, :environment].flatten do
    update_scripts
  end

  def update_scripts(opts = {})
    # optionally, only process modified scripts to speed up seed time
    scripts_seeded_mtime = (opts[:incremental] && File.exist?(SEEDED)) ?
      File.mtime(SEEDED) : Time.at(0)
    touch SEEDED # touch seeded "early" to reduce race conditions
    begin
      custom_scripts = SCRIPTS_GLOB.select { |script| File.mtime(script) > scripts_seeded_mtime }
      LevelLoader.update_unplugged if File.mtime('config/locales/unplugged.en.yml') > scripts_seeded_mtime
      _, custom_i18n = Script.setup(custom_scripts)
      Script.update_i18n(custom_i18n)
    rescue
      rm SEEDED # if we failed to do any of that stuff we didn't seed anything, did we
      raise
    end
  end

  SCRIPTS_DEPENDENCIES = [:environment, :games, :custom_levels, :dsls]
  task scripts: SCRIPTS_DEPENDENCIES do
    update_scripts(incremental: false)
  end

  task scripts_incremental: SCRIPTS_DEPENDENCIES do
    update_scripts(incremental: true)
  end

  # detect changes to dsldefined level files
  # LevelGroup must be last here so that LevelGroups are seeded after all levels that they can contain
  DSL_TYPES = %w(TextMatch ContractMatch External Match Multi EvaluationMulti LevelGroup)
  DSLS_GLOB = DSL_TYPES.map{|x| Dir.glob("config/scripts/**/*.#{x.underscore}*").sort }.flatten
  file 'config/scripts/.dsls_seeded' => DSLS_GLOB do |t|
    Rake::Task['seed:dsls'].invoke
    touch t.name
  end

  # explicit execution of "seed:dsls"
  task dsls: :environment do
    DSLDefined.transaction do
      i18n_strings = {}
      # Parse each .[dsl] file and setup its model.
      DSLS_GLOB.each do |filename|
        dsl_class = DSL_TYPES.detect{|type| filename.include?(".#{type.underscore}") }.try(:constantize)
        begin
          data, i18n = dsl_class.parse_file(filename)
          dsl_class.setup data
          i18n_strings.deep_merge! i18n
        rescue Exception
          puts "Error parsing #{filename}"
          raise
        end
      end
      # Rewrite autogenerated 'dsls.en.yml' i18n file with new master-copy English strings
      i18n_warning = "# Autogenerated English-language level-definition locale file. Do not edit by hand or commit to version control.\n"
      File.write('config/locales/dsls.en.yml', i18n_warning + i18n_strings.deep_sort.to_yaml(line_width: -1))
    end
  end

  task import_custom_levels: :environment do
    LevelLoader.load_custom_levels
  end

  # Generate the database entry from the custom levels json file
  task custom_levels: :environment do
    LevelLoader.load_custom_levels
  end

  task callouts: :environment do
    Callout.transaction do
      Callout.reset_db
      # TODO: If the id of the callout is important, specify it in the tsv
      # preferably the id of the callout is not important ;)
      Callout.find_or_create_all_from_tsv!('config/callouts.tsv')
    end
  end

  task school_districts: :environment do
    # use a much smaller dataset in environments that reseed data frequently.
    school_districts_tsv = CDO.stub_school_data ? 'test/fixtures/school_districts.tsv' : 'config/school_districts.tsv'
    expected_count = `wc -l #{school_districts_tsv}`.to_i - 1
    raise "#{school_districts_tsv} contains no data" unless expected_count > 0

    SchoolDistrict.transaction do
      # It takes approximately 30 seconds to seed config/school_districts.tsv.
      # Skip seeding if the data is already present. Note that this logic may need
      # to be updated once we incorporate data from future survey years.
      if SchoolDistrict.count < expected_count
        # Since other models (e.g. Pd::Enrollment) have a foreign key dependency
        # on SchoolDistrict, don't reset_db first.  (Callout, above, does that.)
        puts "seeding school districts (#{expected_count} rows)"
        SchoolDistrict.find_or_create_all_from_tsv!(school_districts_tsv)
      end
    end
  end

  task schools: :environment do
    # use a much smaller dataset in environments that reseed data frequently.
    schools_tsv = CDO.stub_school_data ? 'test/fixtures/schools.tsv' : 'config/schools.tsv'
    expected_count = `wc -l #{schools_tsv}`.to_i - 1
    raise "#{schools_tsv} contains no data" unless expected_count > 0

    School.transaction do
      # It takes approximately 4 minutes to seed config/schools.tsv.
      # Skip seeding if the data is already present. Note that this logic may need
      # to be updated once we incorporate data from future survey years.
      if School.count < expected_count
        # Since other models will have a foreign key dependency
        # on School, don't reset_db first.  (Callout, above, does that.)
        puts "seeding schools (#{expected_count} rows)"
        School.find_or_create_all_from_tsv(schools_tsv)
      end
    end
  end

  task prize_providers: :environment do
    PrizeProvider.transaction do
      PrizeProvider.reset_db
      # placeholder data - id's are assumed to start at 1 so prizes below can be loaded properly
      [
        {name: 'Apple iTunes', description_token: 'apple_itunes', url: 'http://www.apple.com/itunes/', image_name: 'itunes_card.jpg'},
        {name: 'Dropbox', description_token: 'dropbox', url: 'http://www.dropbox.com/', image_name: 'dropbox_card.jpg'},
        {name: 'Valve Portal', description_token: 'valve', url: 'http://www.valvesoftware.com/games/portal.html', image_name: 'portal2_card.png'},
        {name: 'EA Origin Bejeweled 3', description_token: 'ea_bejeweled', url: 'https://www.origin.com/en-us/store/buy/181609/mac-pc-download/base-game/standard-edition-ANW.html', image_name: 'bejeweled_card.jpg'},
        {name: 'EA Origin FIFA Soccer 13', description_token: 'ea_fifa', url: 'https://www.origin.com/en-us/store/buy/fifa-2013/pc-download/base-game/standard-edition-ANW.html', image_name: 'fifa_card.jpg'},
        {name: 'EA Origin SimCity 4 Deluxe', description_token: 'ea_simcity', url: 'https://www.origin.com/en-us/store/buy/sim-city-4/pc-download/base-game/deluxe-edition-ANW.html', image_name: 'simcity_card.jpg'},
        {name: 'EA Origin Plants vs. Zombies', description_token: 'ea_pvz', url: 'https://www.origin.com/en-us/store/buy/plants-vs-zombies/mac-pc-download/base-game/standard-edition-ANW.html', image_name: 'pvz_card.jpg'},
        {name: 'DonorsChoose.org $750', description_token: 'donors_choose', url: 'http://www.donorschoose.org/', image_name: 'donorschoose_card.jpg'},
        {name: 'DonorsChoose.org $250', description_token: 'donors_choose_bonus', url: 'http://www.donorschoose.org/', image_name: 'donorschoose_card.jpg'},
        {name: 'Skype', description_token: 'skype', url: 'http://www.skype.com/', image_name: 'skype_card.jpg'}
      ].each_with_index do |pp, id|
        PrizeProvider.create!(pp.merge!({:id => id + 1}))
      end
    end
  end

  MAX_LEVEL_SOURCES = 10_000
  desc "calculate solutions (ideal_level_source) for levels based on most popular correct solutions (very slow)"
  task ideal_solutions: :environment do
    require 'benchmark'
    Level.where_we_want_to_calculate_ideal_level_source.each do |level|
      next if level.try(:free_play?)
      puts "Level #{level.id}"
      level_sources_count = level.level_sources.count
      if level_sources_count > MAX_LEVEL_SOURCES
        puts "...skipped, too many possible solutions"
      else
        times = Benchmark.measure { level.calculate_ideal_level_source_id }
        puts "... analyzed #{level_sources_count} in #{times.real.round(2)}s"
      end
    end
  end

  task dummy_prizes: :environment do
    # placeholder data
    Prize.connection.execute('truncate table prizes')
    TeacherPrize.connection.execute('truncate table teacher_prizes')
    TeacherBonusPrize.connection.execute('truncate table teacher_bonus_prizes')
    10.times do |n|
      string = n.to_s
      Prize.create!(prize_provider_id: 1, code: "APPL-EITU-NES0-000" + string)
      Prize.create!(prize_provider_id: 2, code: "DROP-BOX0-000" + string)
      Prize.create!(prize_provider_id: 3, code: "VALV-EPOR-TAL0-000" + string)
      Prize.create!(prize_provider_id: 4, code: "EAOR-IGIN-BEJE-000" + string)
      Prize.create!(prize_provider_id: 5, code: "EAOR-IGIN-FIFA-000" + string)
      Prize.create!(prize_provider_id: 6, code: "EAOR-IGIN-SIMC-000" + string)
      Prize.create!(prize_provider_id: 7, code: "EAOR-IGIN-PVSZ-000" + string)
      TeacherPrize.create!(prize_provider_id: 8, code: "DONO-RSCH-OOSE-750" + string)
      TeacherBonusPrize.create!(prize_provider_id: 9, code: "DONO-RSCH-OOSE-250" + string)
      Prize.create!(prize_provider_id: 10, code: "SKYP-ECRE-DIT0-000" + string)
    end
  end

  task :import_users, [:file] => :environment do |_t, args|
    CSV.read(args[:file], { col_sep: "\t", headers: true }).each do |row|
      User.create!(
        provider: User::PROVIDER_MANUAL,
        name: row['Name'],
        username: row['Username'],
        password: row['Password'],
        password_confirmation: row['Password'],
        birthday: row['Birthday'].blank? ? nil : Date.parse(row['Birthday']))
    end
  end

  def import_prize_from_text(file, provider_id, col_sep)
    Rails.logger.info "Importing prize codes from: " + file + " for provider id " + provider_id.to_s
    CSV.read(file, { col_sep: col_sep, headers: false }).each do |row|
      if row[0].present?
        Prize.create!(prize_provider_id: provider_id, code: row[0])
      end
    end
  end

  task :import_itunes, [:file] => :environment do |_t, args|
    import_prize_from_text(args[:file], 1, "\t")
  end

  task :import_dropbox, [:file] => :environment do |_t, args|
    import_prize_from_text(args[:file], 2, "\t")
  end

  task :import_valve, [:file] => :environment do |_t, args|
    import_prize_from_text(args[:file], 3, "\t")
  end

  task :import_ea_bejeweled, [:file] => :environment do |_t, args|
    import_prize_from_text(args[:file], 4, "\t")
  end

  task :import_ea_fifa, [:file] => :environment do |_t, args|
    import_prize_from_text(args[:file], 5, "\t")
  end

  task :import_ea_simcity, [:file] => :environment do |_t, args|
    import_prize_from_text(args[:file], 6, "\t")
  end

  task :import_ea_pvz, [:file] => :environment do |_t, args|
    import_prize_from_text(args[:file], 7, "\t")
  end

  task :import_skype, [:file] => :environment do |_t, args|
    import_prize_from_text(args[:file], 10, ",")
  end

  task :import_donorschoose_750, [:file] => :environment do |_t, args|
    Rails.logger.info "Importing teacher prize codes from: " + args[:file] + " for provider id 8"
    CSV.read(args[:file], { col_sep: ",", headers: true }).each do |row|
      if row['Gift Code'].present?
        TeacherPrize.create!(prize_provider_id: 8, code: row['Gift Code'])
      end
    end
  end

  task :import_donorschoose_250, [:file] => :environment do |_t, args|
    Rails.logger.info "Importing teacher bonus prize codes from: " + args[:file] + " for provider id 9"
    CSV.read(args[:file], { col_sep: ",", headers: true }).each do |row|
      if row['Gift Code'].present?
        TeacherBonusPrize.create!(prize_provider_id: 9, code: row['Gift Code'])
      end
    end
  end

  task secret_words: :environment do
    SecretWord.setup
  end

  task secret_pictures: :environment do
    SecretPicture.setup
  end

  desc "seed all dashboard data"
  task all: [:videos, :concepts, :scripts, :prize_providers, :callouts, :school_districts, :schools, :secret_words, :secret_pictures]
  desc "seed all dashboard data that has changed since last seed"
  task incremental: [:videos, :concepts, :scripts_incremental, :prize_providers, :callouts, :school_districts, :schools, :secret_words, :secret_pictures]

  desc "seed only dashboard data required for tests"
  task test: [:videos, :games, :concepts, :prize_providers, :secret_words, :secret_pictures]
end
