require_relative '../../deployment'
require 'cdo/hip_chat'
require 'cdo/rake_utils'
require 'cdo/git_utils'

namespace :build do
  desc 'Runs Chef Client to configure the OS environment.'
  task :configure do
    if CDO.chef_managed
      HipChat.log 'Applying <b>chef</b> profile...'
      RakeUtils.sudo 'chef-client'
    end

    unless CDO.chef_managed
      Dir.chdir(aws_dir) do
        HipChat.log 'Installing <b>aws</b> bundle...'
        RakeUtils.bundle_install
      end
    end
  end

  desc 'Builds blockly core.'
  task :blockly_core do
    Dir.chdir(blockly_core_dir) do
      RakeUtils.npm_install

      HipChat.log 'Building <b>blockly-core</b> debug...'
      RakeUtils.system './deploy.sh', 'debug'

      HipChat.log 'Building <b>blockly-core</b>...'
      RakeUtils.system './deploy.sh'
    end
  end
  task :'blockly-core' => :blockly_core

  task :core_and_apps_dev do
    Dir.chdir(apps_dir) do
      RakeUtils.system './build_with_core.sh debug'
    end
  end

  desc 'Builds apps.'
  task :apps do
    Dir.chdir(apps_dir) do
      HipChat.log 'Installing <b>apps</b> dependencies...'
      RakeUtils.npm_install

      if rack_env?(:staging)
        HipChat.log 'Updating <b>apps</b> i18n strings...'
        RakeUtils.system './sync-apps.sh'
      end

      HipChat.log 'Building <b>apps</b>...'
      npm_target = rack_env?(:development) ? 'build' : 'build:dist'
      RakeUtils.system "npm run #{npm_target}"
    end
  end

  # TODO: (brent) - temporarily leave in a build step that just does a clean of
  # code-studio to make sure we don't have artifacts from old builds
  desc 'Builds code studio.'
  task :code_studio do
    Dir.chdir(code_studio_dir) do
      HipChat.log 'Building <b>code-studio</b>...'
      RakeUtils.system 'rm -rf build'
    end
  end
  task :'code-studio' => :code_studio

  task :stop_varnish do
    Dir.chdir(aws_dir) do
      unless rack_env?(:development) || (RakeUtils.system_('ps aux | grep -v grep | grep varnishd -q') != 0)
        HipChat.log 'Stopping <b>varnish</b>...'
        RakeUtils.stop_service 'varnish'
      end
    end
  end

  desc 'Builds dashboard (install gems, migrate/seed db, compile assets).'
  task dashboard: :package do
    Dir.chdir(dashboard_dir) do
      # Unless on production, serve UI test directory
      unless rack_env?(:production)
        RakeUtils.ln_s('../test/ui', dashboard_dir('public', 'ui_test'))
      end

      HipChat.log 'Stopping <b>dashboard</b>...'
      RakeUtils.stop_service CDO.dashboard_unicorn_name unless rack_env?(:development)

      HipChat.log 'Installing <b>dashboard</b> bundle...'
      RakeUtils.bundle_install

      if CDO.daemon
        HipChat.log 'Migrating <b>dashboard</b> database...'
        RakeUtils.rake 'db:migrate'

        # Update the schema cache file, except for production which always uses the cache.
        schema_cache_file = dashboard_dir('db/schema_cache.dump')
        unless rack_env?(:production)
          RakeUtils.rake 'db:schema:cache:dump'
          if GitUtils.file_changed_from_git?(schema_cache_file)
            # Staging is responsible for committing the authoritative schema cache dump.
            if rack_env?(:staging)
              RakeUtils.system 'git', 'add', schema_cache_file
              HipChat.log 'Committing updated schema_cache.dump file...', color: 'purple'
              RakeUtils.system 'git', 'commit', '-m', '"Update schema cache dump after schema changes."', schema_cache_file
              RakeUtils.git_push
              # The schema dump from the test database should always match that generated by staging.
            elsif rack_env?(:test) && GitUtils.current_branch == 'test'
              raise 'Unexpected database schema difference between staging and test (http://wiki.code.org/display/PROD/Unexpected+database+schema+difference+between+staging+and+test)'
            end
          end
        end

        # Allow developers to skip the time-consuming step of seeding the dashboard DB.
        if rack_env?(:development) && CDO.skip_seed_all
          HipChat.log "Not seeding <b>dashboard</b> due to CDO.skip_seed_all...\n"\
              "Until you manually run 'rake seed:all' or disable this flag, you won't\n"\
              "see changes to: videos, concepts, levels, scripts, trophies, prize providers, \n "\
              "callouts, hints, secret words, or secret pictures."
        else
          HipChat.log 'Seeding <b>dashboard</b>...'
          HipChat.log 'consider setting "skip_seed_all" in locals.yml if this is taking too long' if rack_env?(:development)
          RakeUtils.rake 'seed:all'
        end
      end

      unless rack_env?(:development)
        HipChat.log 'Precompiling <b>dashboard</b> assets...'
        RakeUtils.rake 'assets:precompile'
      end

      HipChat.log 'Starting <b>dashboard</b>.'
      RakeUtils.start_service CDO.dashboard_unicorn_name unless rack_env?(:development)

      if rack_env?(:production)
        RakeUtils.rake "honeybadger:deploy TO=#{rack_env} REVISION=`git rev-parse HEAD`"
      end
    end
  end

  desc 'Builds pegasus (install gems, migrate/seed db).'
  task :pegasus do
    Dir.chdir(pegasus_dir) do
      HipChat.log 'Stopping <b>pegasus</b>...'
      RakeUtils.stop_service CDO.pegasus_unicorn_name unless rack_env?(:development)

      HipChat.log 'Installing <b>pegasus</b> bundle...'
      RakeUtils.bundle_install

      if CDO.daemon
        HipChat.log 'Migrating <b>pegasus</b> database...'
        begin
          RakeUtils.rake 'db:migrate'
        rescue => e
          HipChat.log "/quote #{e.message}\n#{CDO.backtrace e}", message_format: 'text'
          raise e
        end

        HipChat.log 'Seeding <b>pegasus</b>...'
        begin
          RakeUtils.rake 'seed:migrate'
        rescue => e
          HipChat.log "/quote #{e.message}\n#{CDO.backtrace e}", message_format: 'text'
          raise e
        end
      end

      HipChat.log 'Starting <b>pegasus</b>.'
      RakeUtils.start_service CDO.pegasus_unicorn_name unless rack_env?(:development)
    end
  end

  task :start_varnish do
    Dir.chdir(aws_dir) do
      unless rack_env?(:development) || (RakeUtils.system_('ps aux | grep -v grep | grep varnishd -q') == 0)
        HipChat.log 'Starting <b>varnish</b>...'
        RakeUtils.start_service 'varnish'
      end
    end
  end

  tasks = []
  tasks << :configure
  tasks << :blockly_core if CDO.build_blockly_core
  tasks << :apps if CDO.build_apps
  tasks << :code_studio if CDO.build_code_studio
  tasks << :stop_varnish if CDO.build_dashboard || CDO.build_pegasus
  tasks << :dashboard if CDO.build_dashboard
  tasks << :pegasus if CDO.build_pegasus
  tasks << :start_varnish if CDO.build_dashboard || CDO.build_pegasus
  task :all => tasks
end

desc 'Builds everything.'
task :build => ['build:all']
