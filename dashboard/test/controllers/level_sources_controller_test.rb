require 'test_helper'

class LevelSourcesControllerTest < ActionController::TestCase
  include Devise::TestHelpers
  setup do
    @user = create(:admin)
    @level_source = create(:level_source)
    sign_in(@user)
  end

  test "should get edit" do
    get :edit, id: @level_source.id
    assert_response :success
    assert_equal([], assigns(:callouts))
  end

  test "should get show" do
    get :show, id: @level_source.id
    assert_response :success
    assert_equal([], assigns(:callouts))
  end

  test 'routing' do
    assert_routing({ path: '/u/1', method: :get },
                   { controller: 'level_sources', action: 'show', id: '1' })
    assert_routing({ path: '/u/1/edit', method: :get },
                   { controller: 'level_sources', action: 'edit', id: '1' })
    assert_routing({ path: '/u/1/original_image', method: :get }, 
                   {controller: 'level_sources', action: 'original_image', id: '1' })
    assert_routing({ path: '/u/1/generate_image', method: :get },
                   { controller: 'level_sources', action: 'generate_image', id: '1' })
  end

  test "generate image for artist" do
    artist_level = create :level, game: create(:game, app: Game::ARTIST)
    level_source = create :level_source, level: artist_level
    level_source_image = create :level_source_image, level_source: level_source
    
    get :generate_image, id: level_source.id

    # generates a framed image
    assert level_source_image.image != @response.body, "generated image is the original image, not framed"
  end

  test "generate image for playlab" do
    playlab_level = create :level, game: create(:game, app: Game::PLAYLAB)
    level_source = create :level_source, level: playlab_level
    level_source_image = create :level_source_image, level_source: level_source
    
    get :generate_image, id: level_source.id

    # returns the original image
    assert level_source_image.image == @response.body, "generated image is not the original image"
  end

  test "cache headers for generate image" do
    level = create :level, game: create(:game, app: Game::PLAYLAB)
    level_source = create :level_source, level: level
    create :level_source_image, level_source: level_source

    get :generate_image, id: level_source.id

    assert_equal "max-age=36000, public", response.headers["Cache-Control"]
  end

  test "cache headers for original image" do
    level = create :level, game: create(:game, app: Game::PLAYLAB)
    level_source = create :level_source, level: level
    create :level_source_image, level_source: level_source

    get :original_image, id: level_source.id

    assert_equal "max-age=36000, public", response.headers["Cache-Control"]
  end

end
