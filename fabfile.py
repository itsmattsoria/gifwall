from fabric.api import *
import os

env.hosts = ['opal4.opalstack.com']
env.user = 'soriamatt'
env.path = '~/Sites/gifwall'
env.remotepath = '/home/soriamatt/apps/gifwall'
env.git_branch = 'master'
env.warn_only = True
env.remote_protocol = 'http'

def deploy():
  update()

def update():
  with cd(env.remotepath):
    run('git pull origin {0}'.format(env.git_branch))
